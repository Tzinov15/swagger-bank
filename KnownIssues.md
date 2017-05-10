
# Unsupported Features / Remaining Issues

[Single Response Per Route](#single-response-per-route)  
[Limited Parameter Section Parsing](#limited-parameter-section-parsing)  
[Heterogeneous Arrays of Objects](#heterogeneous-arrays-of-objects)  
[Enums](#enums)  
[Multiple Parameter Ref tags](#multiple-parameter-ref-tags)  
[Swagger Inheritance and Composition](#swagger-inheritance-and-composition)  

# Single Response per Route
Due to Mountebanks weird style of <a href = 'http://www.mbtest.org/docs/api/stubs'>"round-robining"</a> through multiple responses set on a single path (uri + verb), SwaggerBank will only extract a **single** response that is defined with a status code of 200, 201, or `default`. Extracting each response means posting multiple responses to Mountebank for a single path which means round-robin behavior. I wanted to avoid this because round-robining will result in non-idempotent behavior when testing (hitting the same mocked route could return different responses depending on number of times route was hit prior). If you have any suggestions on a more elegant solution please open an issue and let me know.  

# Limited Parameter Section Parsing
My focus when I started SwaggerBank was to be able to intelligently and efficiency parse out response
definitions and object schemas and generate random data to adhere to those schemas and definitions. I have
not placed a lot of focus on the parameter sections of the spec. This means that for the mocked out routes, they place **very little enforcement** on the incoming request. ie: If the request matches the path + verb specified in the spec and includes the correct types for **url parameters**, then the request is considered a valid request. Any necessary body parameters, header values, query parameters, and/or auth headers that are required as per the spec **are ignored**. Again my initial focus was on the responses, not the requests. SwaggerBank 2.0 will include a completely revamped parsing of the parameter sections of the spec and a respective rehaul to MountebankHelper. With SwaggerBank 2.0, any `required` components for the request to a certain route (query parameters, body parameters, headers, etc) will also be required when hitting the mocked API. That way only a **valid** http request will result in the return of a mocked out response


# Heterogeneous Arrays of Objects


Yeah, probably not going to support this. This is weird

  ```yaml

  items:
    - properties:
        text:
          type: string
        ts:
          type: string
        type:
          type: string
        user:
          type: string
      type: object
    - properties:
        is_starred:
          type: boolean
        text:
          type: string
        ts:
          type: string
        type:
          type: string
        user:
          type: string
      type: object
    - properties:
        ts:
          type: string
        type:
          type: string
        wibblr:
          type: boolean
      type: object
  type: array
  ```



# Enums
This is a big issues. WE DO NOT SUPPORT THIS STYLE OF DECLARING ENUMS   
We have a type array, where each item of that array can only be one of the enum values

```yaml

events:
  items:
    enum:
      - push
      - issues
      - issue_comment
      - commit_comment
      - pull_request
      - pull_request_review_comment
      - gollum
      - watch
      - download
      - fork
      - fork_apply
      - member
      - public
      - team_add
      - status
  type: array
  ```

We have a property, in this case encoding, that DOES NOT have a type (string, object, array, etc), but instead has an enum value. We will set the type to string (by default) and the format as enum

```yaml

blob:
  properties:
    content:
      type: string
    encoding:
      enum:
        - utf-8
        - base64
    sha:
      type: string
    size:
      type: integer
  type: object
  ```


We have a property, in this mode, that HAS A TYPE (string) and also has a specified enum. This means the property must be a string, and must only be one of the enum values

  ```yaml
  
  properties:
    mode:
      description: 'One of 100644 for file (blob), 100755 for executable (blob), 040000 for subdirectory (tree), 160000 for submodule (commit) or 120000 for a blob that specifies the path of a symlink.'
      enum:
        - '100644'
        - '100755'
        - '040000'
        - '160000'
        - '120000'
      type: string
  ```




# MULTIPLE PARAMETER REF tags  
Perhaps the biggest remaining issue left with SwaggerBank, this will cause the initial `api.validate()` method to fail (essentially SwaggerBank can't even run). See explanation below

```yaml

paths:
  '/calendars':
    parameters:
      - $ref: '#/parameters/alt'
      - $ref: '#/parameters/fields'
      - $ref: '#/parameters/key'
      - $ref: '#/parameters/oauth_token'
      - $ref: '#/parameters/prettyPrint'
      - $ref: '#/parameters/quotaUser'
      - $ref: '#/parameters/userIp'
```


Having multiple references to parameter objects within a single parameters object. [SwaggerParser](https://github.com/BigstickCarpet/swagger-parser) (the tool we use for parsing) DOES NOT SUPPORT THIS directly.
The issue is that we DON'T RESOLVE INTERNAL references (because we generate our global template hash from these unresolved references) and
therefore the parameters section remains as a LIST OF $REFS. SwaggerParser then assumes that the parameters section is a list of RESOLVED PARAMETERS containing
 "name", "in", "description", etc which they are not Ex. It assumes that the first field for each "resolved parameter object" is the parameters name and the value
 is the parameter object. Because these "resolved parameter objects" are actually just a series of $ref: '#/parameters/blah1' , $ref: '#/parameters/blah2' statements,
 SwaggerParser raises an error on "duplicate parameter names" because it sees several consecutive '$ref's

POSSIBLE SOLUTIONS:
- Indeed resolve internal references and then reimplement logic for generating template hash
(new logic wouldn't be bad, would have to do performance tests on each, see if we can keep that large of JSON object in memory)
- Continue to not resolve internal references and find another way to PREPROCESS this parameters section to manually resolve it.    
  Considering that the SwaggerParser.validate() method can take in a path to a file OR a COMPLETE SWAGGER OBJECT, we can actually
  give it a Swagger object that already has this parameters section (for each path) pre-resolved
- Do not support list of parameter references


# Swagger Inheritance and Composition
This could be supported, would require a lot of work

```json
"Pet": {
    "discriminator": "petType",
    "properties": {
      "name": {
        "type": "string"
      },
      "petType": {
        "type": "string"
      }
    },
    "required": [
      "name",
      "petType"
    ]
  },
  "Cat": {
    "description": "A representation of a cat",
    "allOf": [
      {
        "$ref": "#/definitions/Pet"
      },
      {
        "properties": {
          "huntingSkill": {
            "type": "string",
            "description": "The measured skill for hunting",
            "default": "lazy",
            "enum": [
              "clueless",
              "lazy",
              "adventurous",
              "aggressive"
            ]
          }
        },
        "required": [
          "huntingSkill"
        ]
      }
    ]
  },
  "Dog": {
    "description": "A representation of a dog",
    "allOf": [
      {
        "$ref": "#/definitions/Pet"
      },
      {
        "properties": {
          "packSize": {
            "type": "integer",
            "format": "int32",
            "description": "the size of the pack the dog is from",
            "default": 0,
            "minimum": 0
          }
        },
        "required": [
          "packSize"
        ]
      }
    ]
  }
  ```







## Potentially Problematic Things

A definition for an object that does not have the `type: object` field but is inferred to be an object based on the properties field. If this brings up problems, simply add the `type: object` field

```yaml
thumbnail:
  properties:
    height:
      description: Thumnail height
      type: integer
    source:
      description: Thumbnail image URI
      type: string
    width:
      description: Thumbnail width
      type: integer
```

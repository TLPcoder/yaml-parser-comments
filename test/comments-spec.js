const fs = require('fs')
const { expect } = require('chai')
const JsonToYamlPreserveComments = require('../index')

const readFile = (path, encoding = 'utf8') => fs.readFileSync(__dirname + path, encoding)

const yaml = readFile('/original.yaml') 
const json = readFile('/edited.json') 
const updatedYaml = readFile('/updated.yaml')

describe('', function() {
  it('extend yaml with json changes and keep comments', function() {
    expect(JsonToYamlPreserveComments(yaml, json)).eq(updatedYaml)
  })
}) 


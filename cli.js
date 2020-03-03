const fs = require('fs')
const JsonToYamlPreserveComments = require('./index')

const readFile = (path, encoding = 'utf8') => fs.readFileSync(__dirname + path, encoding)
const resolve = (arg) => yaml.startsWith('/') ? readFile(arg) : arg

const params = process.argv.slice(2)
const [ yaml, json ] = params
const yamlFile = resolve(yaml)
const jsonFile = resolve(json)

console.log('YAML', yamlFile)
console.log('JSON', jsonFile)
console.log('RESULT', JsonToYamlPreserveComments(yamlFile, jsonFile))

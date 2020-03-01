const fs = require('fs')
const YAML = require('js-yaml');

const readFile = (path, encoding = 'utf8') => fs.readFileSync(__dirname + path, encoding)
const writeFile = (path, data, encoding = 'utf8') => fs.writeFileSync(__dirname + path, data, encoding)
const isComment = (str) => str.trim().startsWith('#') 
const isCommentInData = (str) => str.trim().replace(/#.*/, '').length > 0 ? true : false
const containsComment = (line, comment) => line.includes(comment)

function findComments(yaml) {
  const comments = []

  for(let i = 0; i < yaml.length; i++) {
    if (yaml[i] === '#') {
      let startOfComment = i - 1
      let endOfComment = i

      while(yaml[startOfComment] === ' ') {
        startOfComment--
      }
      while(yaml[endOfComment] !== '\n') {
        endOfComment++
      }

      comments.push(yaml.slice(startOfComment + 1, endOfComment + 1))
    }
  }
  return comments
}

function findLineBound(start, yaml) {
  let end = start

  while(yaml[end] != '\n') end++
  end++
  return { start, end }
}

function whiteSpacesStart (str) {
  let i = 0
  while(str[i] === ' ') i++
  return i
}

function isDiffLevel(cur, last) {
  if (!last) return 'sameLevel'

  const curSpaces = whiteSpacesStart(cur)
  const lastSpaces = whiteSpacesStart(last)

  if (curSpaces > lastSpaces) return 'downLevel'
  if (lastSpaces > curSpaces) return 'upLevel'
  else return 'sameLevel'
}

function getLine (start, end, yaml, isCur) {
  const line = yaml.slice(start, end)

  if (!isCur && line.trim().startsWith('#')) {
    const bound = findLineBound(end + 1, yaml)
    return getLine(bound.start, bound.end, yaml)
  }

  return line
}

function spaces(str) {
  let i = 0
  while(str[i] === ' ') i++
  return i
}

function updatePath(path, curLine, levelChange) {
  if (!isComment(curLine)) {
      if (levelChange === 'downLevel') {
        path.push(curLine.replace(/#.*\n/, '\n').trimRight())
    }

    if (levelChange === 'upLevel') {
      var run = spaces(path[path.length - 1]) / spaces(curLine)

      for(let i = 0; i < run; i++) {
        path.pop()
      }

      path.push(curLine.replace(/#.*\n/, '\n').trimRight())
    }

    if (levelChange === 'sameLevel') {
      path.pop()
      path.push(curLine.replace(/#.*\n/, '\n').trimRight())
      return
    }
  }
}

function injectComment(yaml, path, curLine, bound, pathComments) {
  pathComments.map((pathComment, i) => {
    if (JSON.stringify(path) === JSON.stringify(pathComment.path)) {
      pathComments.splice(i, 1)
      const { comment, commentInData } = pathComment
      if (commentInData) {
        yaml = yaml.slice(0, bound.end - curLine.length) + curLine.replace(/\n/, '') + comment + yaml.slice(bound.end)
        bound.end = bound.end + ((curLine.replace(/\n/, '') + comment).length - curLine.length)
        yaml = injectComment(yaml, path, curLine, bound, pathComments)
      }
      else {
        yaml = yaml.slice(0, bound.end) + comment + yaml.slice(bound.end)
        yaml = injectComment(yaml, path, curLine, bound, pathComments)
      }
    }
  })

  return yaml
}

const pathToComment = (yaml) => {
  const comments = findComments(yaml)
  const commentMapping = []
  const path = []
  let start = 0

  while(start < yaml.length) {
    let bound = findLineBound(start, yaml)
    let curLine = getLine(bound.start, bound.end, yaml, true)
  
    if (curLine.trim() === '') {
      start++
      continue
    }
  
    const levelChange = isDiffLevel(curLine, path[path.length - 1])
    updatePath(path, curLine, levelChange)

    if (containsComment(curLine, comments[0])) {
      const comment = comments.shift()
      const commentInData = isCommentInData(curLine)
      commentMapping.push({
        comment,
        commentInData,
        path: path.slice()
      })
    }

    start = bound.end
  }
  return commentMapping
}

function update(yaml, pathComments) {
  const path = []

  yaml = yaml.replace(/#.*/g, '').replace(/^\s*\n/gm, '');

  let start = 0

  while(start < yaml.length) {
    let bound = findLineBound(start, yaml)
    let curLine = getLine(bound.start, bound.end, yaml, true)

    if (curLine.trim() === '') {
      start++
      continue
    }

    const levelChange = isDiffLevel(curLine, path[path.length - 1])
    updatePath(path, curLine, levelChange)

    yaml = injectComment(yaml, path, curLine, bound, pathComments)

    start = bound.end
  }
  return yaml
}


function JsonToYamlPreserveComments(originalYaml, newJson) {
  const pathComments = pathToComment(originalYaml)
  const yaml = YAML.safeDump(newJson, { noCompatMode: true })

  writeFile('/newYaml.yaml', update(yaml, pathComments))
}

var yaml = readFile('/original.yaml') 
var json = readFile('/edited.json')
JsonToYamlPreserveComments(yaml, JSON.parse(json))
  
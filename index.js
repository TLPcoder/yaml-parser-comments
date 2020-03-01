const fs = require('fs')

const readFile = (path, encoding = 'utf8') => fs.readFileSync(__dirname + path, encoding)
const writeFile = (path, data, encoding = 'utf8') => fs.writeFileSync(__dirname + path, data, encoding)
// const findComments = (yaml) => yaml.match(/#.*\n/g)
const findComments = (yaml) => {
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
const isComment = (str) => str.trim().startsWith('#') 
const isCommentInData = (str) => str.trim().replace(/#.*/, '').length > 0 ? true : false
const containsComment = (line, comment) => line.includes(comment)

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

function updatePath(path, curLine, levelChange) {
  if (!isComment(curLine)) {
      if (levelChange === 'downLevel') {
        path.push(curLine.replace(/#.*\n/, '\n'))
    }

    if (levelChange === 'upLevel') {
      path.pop()
      path.pop()
      path.push(curLine.replace(/#.*\n/, '\n'))
    }

    if (levelChange === 'sameLevel') {
      path.pop()
      path.push(curLine.replace(/#.*\n/, '\n'))
    }
  }
}

function injectComment(yaml, path, curLine, bound, pathComments) {
  if (pathComments.length && JSON.stringify(path) === JSON.stringify(pathComments[0].path)) {
    const { comment, commentInData } = pathComments.shift()
    if (commentInData) {
      yaml = yaml.slice(0, bound.end - curLine.length) + curLine.replace(/\n/, '') + comment + yaml.slice(bound.end)
      // bound.end = bound.end + ((curLine.replace(/\n/, '') + comment).length - curLine.length)
      return injectComment(yaml, path, curLine, bound, pathComments)
    }
    else {
      yaml = yaml.slice(0, bound.end) + comment + yaml.slice(bound.end)
      return injectComment(yaml, path, curLine, bound, pathComments)
    }
  } else {
    return yaml
  }
}

const pathToComment = (yaml) => {
  const comments = findComments(yaml)
  const commentMapping = []
  const path = []
  let start = 0

  while(comments.length) {
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

function update(yaml) {
  const pathComments = pathToComment(yaml)
  const path = []

  yaml = yaml.replace(/#.*/g, '').replace(/^\s*\n/gm, '');

  let start = 0

  while(pathComments.length) {
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
  writeFile('/newYaml.yaml', yaml)
}

const yaml = readFile('/original.yaml')

update(yaml)
import moment from 'moment'

export const cryptoText = (text) => {
    let strTempChar = ''
    let encText = ''
    for(let i = 0; i<text.length; i++) {
        let char = text.charAt(i)
        if(char.charCodeAt(0) < 128) {
            strTempChar = char.charCodeAt(0) + 128
        }
        else if(char.charCodeAt(0) > 128) {
            strTempChar = char.charCodeAt(0) - 128
        }
        encText += String.fromCharCode(strTempChar)
    }
    return encText
}

export const validateToken = (expireTime) => {
    let expireArr = expireTime.replace(/-/g, '/').split('/')    
    let formattedExpireTime = expireArr[1]+'/'+expireArr[0]+'/'+expireArr[2]
    
    let tokenExpireTime = moment(new Date(Date.parse(formattedExpireTime)))
    let currentTime = moment()
    if(currentTime > tokenExpireTime) {
        return false
    }
    else {
        return true
    }
}

export const SCAN_TYPES = {
    SAT_TYPE: 'sat',
    PAT_TYPE: 'pat'
}

export const getQuestionsPAT_34 = (classId, subject, stream = null) => {
    let question = 0
    if(classId == 9) {
      question = 10
      if(subject=='math') {
        question = 11
      }
    }
    else if(classId == 10) {
      if(subject == 'math') {
        question = 34
      } else if(subject == 'science') {
        question = 33
      } else if(subject == 'socialScience') {
        question = 27
      }
    }
    else if(classId == 12) {
      if(stream && stream == 'sci') {
        question = 32
      }
      else if(stream && stream == 'gen') {
        question = 31
        if(subject == '154') {
          question = 20
        } else if(subject == '046'){
          question= 29
        } else if(subject == '141'){
          question= 30
        } else if(subject == '136'){
          question= 32
        }
      }
    }
    return question
  }
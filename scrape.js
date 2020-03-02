
const { JSDOM } = require('jsdom')
const fs = require('fs')
const path = require('path')

function determineTimes(startTime, endTime) {
    let [startHours, startMinutes] = startTime.split(':').map(piece => parseInt(piece))
    let [endHours, endMinutes] = endTime.replace('AM', '').replace('PM', '').split(':').map(piece => parseInt(piece))

    if (endTime.includes('PM')) {
        if (endHours < 12) {
            endHours += 12
        }
        if (startHours + 12 <= endHours) {
            startHours += 12
        }
    }

    return {
        startTime: `${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`,
        endTime: `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`,
    }
}

function getPeriods(document) {
    const rows = document.querySelectorAll('div > div > center table > tbody > tr')

    const periods = []
    let lastCRN
    let lastCourseSubjectCode
    let lastCourseNumber
    let lastCourseTitle
    rows.forEach(row => {
        const pieces = []
        const tds = row.querySelectorAll('td')
        tds.forEach(td => pieces.push(td.textContent.trim()))

        if (pieces.length === 0 || !pieces[5]) return

        let [crn, summary] = pieces[0].split(' ')
        let courseSubjectCode, courseNumber, sectionId
        if (!crn || !summary) {
            // Change of section
            crn = lastCRN
            courseSubjectCode = lastCourseSubjectCode
            courseNumber = lastCourseNumber
            courseTitle = lastCourseTitle
        } else {
            [courseSubjectCode, courseNumber, sectionId] = summary.split('-')
            courseTitle = pieces[1]
        }

        periods.push({
            crn,
            courseTitle,
            courseSubjectCode,
            courseNumber,
            sectionId,
            periodType: pieces[2],
            credits: pieces[3],
            days: pieces[5].replace(/ /g, '').split('').map(letter => ({ M: 1, T: 2, W: 3, R: 4, F: 5 }[letter])),
            instructors: pieces[8].split('/'),
            location: pieces[9],
            ...determineTimes(pieces[6], pieces[7]),
        })

        lastCRN = crn
        lastCourseSubjectCode = courseSubjectCode
        lastCourseNumber = courseNumber
        lastCourseTitle = courseTitle
    })

    return periods
}

function getCourseFromPeriods(periods) {
    const courses = []

    for (const period of periods) {
        const { courseSubjectCode, courseNumber, crn, sectionId } = period

        let course = courses.find(c => c.subjectCode === courseSubjectCode && c.number === courseNumber);
        if (!course) {
            course = {
                subjectCode: courseSubjectCode,
                number: courseNumber,
                title: period.courseTitle,
                sections: []
            }
            courses.push(course)
        }

        let section = course.sections.find(section => section.crn === crn)
        if (!section) {
            section = {
                crn: crn,
                sectionId: sectionId,
                periods: []
            }
            course.sections.push(section)
        }

        section.periods.push(period)
    }

    return courses
}

async function run(termCode) {
    console.log(`Getting page for ${termCode}...`)
    const dom = await JSDOM.fromURL(`https://sis.rpi.edu/reg/zs${termCode}.htm`)
    console.log('Parsing HTML...')
    const periods = getPeriods(dom.window.document)
    const courses = getCourseFromPeriods(periods)

    console.log('Writing to courses.json...')
    fs.writeFileSync(path.join(__dirname, 'data/', termCode + '.json'), JSON.stringify(courses))
    console.log('Done!')
}

run('202001');
run('20200501');
run('20200502');
run('20200503');
document.addEventListener('DOMContentLoaded', () => {
    const app = new Vue({
        el: '#app',
        data: {
            search: '',
            selectTerm: '20200501',
            displayTerm: '20200501',
            courses: [],
            selectedCRNs: [],
            hoveredCRN: null,
            calendar: null
        },
        async mounted() {
            if (localStorage.getItem('selectedCRNs') !== null) {
                try {
                    this.selectedCRNs = JSON.parse(localStorage.getItem('selectedCRNs'))
                } catch (e) {
                    localStorage.removeItem('selectedCRNs')
                }
            }

            await this.getCourses()

            this.calendar = new FullCalendar.Calendar(this.$refs.calendar, {
                plugins: ['dayGrid', 'timeGrid'],
                defaultView: 'timeGridWeek',
                columnHeaderFormat: {
                    weekday: 'long'
                },
                customButtons: {
                    firstTerm: {
                        text: 'First Term',
                        click: () => {
                            this.displayTerm = '20200502'
                        }
                    },
                    bothTerms: {
                        text: 'Both Terms',
                        click: () => {
                            this.displayTerm = '20200501'
                        }
                    },
                    secondTerm: {
                        text: 'Second Term',
                        click: () => {
                            this.displayTerm = '20200503'
                        }
                    }
                },
                header: {
                    left: '',
                    center: 'firstTerm,bothTerms,secondTerm',
                    right: ''
                },
                color: 'green',
                weekends: false,
                slotDuration: '01:00:00',
                allDaySlot: false,
                minTime: '08:00:00',
                maxTime: '20:00:00',
                height: '100%',
                events: (info, successCallback) => successCallback(this.courseEvents)
            })

            this.calendar.render()
        },
        watch: {
            selectedCRNs() {
                localStorage.setItem('selectedCRNs', JSON.strngify(this.selectedCRNs))
            },
            courseEvents(newEvents) {
                if (this.calendar) {
                    this.calendar.refetchEvents()
                }
            }
        },
        computed: {
            filteredSelectCourses () {
                return this.courses.filter(course => course.termCode === this.selectTerm)
            },
            groupedBySubjectCode() {
                const grouped = {}
                for (const course of this.filteredSelectCourses) {
                    if (!(course.subjectCode in grouped)) {
                        grouped[course.subjectCode] = []
                    }

                    grouped[course.subjectCode].push(course)
                }

                return grouped
            },
            selectedSections() {
                return this.courses.map(course => course.sections).flat().filter(section => this.selectedCRNs.includes(section.crn))
            },
            hoveredSection() {
                if (this.hoveredCRN === null) return null

                return this.courses.map(course => course.sections).flat().find(section => section.crn === this.hoveredCRN)
            },
            hoveredSectionEvents() {
                if (this.hoveredCRN === null) return []
                return this.hoveredSection.periods.map(period => ({
                    ...this.mapPeriodToEvent(period),
                    color: 'darkgreen'
                }))
            },
            courseEvents() {
                return this.selectedSections.map(section => section.periods).flat().map(this.mapPeriodToEvent).concat(this.hoveredSectionEvents)
            }
        },
        methods: {
            async getJSON(url) {
                const reponse = await fetch(url)
                return await reponse.json()
            },
            async getCourses () {
                this.courses = (await this.getJSON('/data/20200502.json')).concat(await this.getJSON('/data/20200503.json')).concat(await this.getJSON('/data/20200501.json'))
            },
            mapPeriodToEvent(period) {
                return {
                    title: period.courseTitle,
                    daysOfWeek: period.days,
                    startTime: period.startTime,
                    endTime: period.endTime
                }
            },
            toggleCRN(crn) {
                if (this.selectedCRNs.includes(crn)) {
                    this.selectedCRNs =
                        this.selectedCRNs.filter(selectedCrn => selectedCrn !== crn)
                } else {
                    this.selectedCRNs.push(crn)
                }
            }
        }
    })
})
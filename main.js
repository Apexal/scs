document.addEventListener('DOMContentLoaded', () => {
    const app = new Vue({
        el: '#app',
        data: {
            courses: [],
            selectedCRNs: [],
            hoveredCRN: null,
            calendar: null
        },
        async mounted() {
            const response = await fetch('/courses.json')
            this.courses = await response.json()

            this.calendar = new FullCalendar.Calendar(this.$refs.calendar, {
                plugins: ['dayGrid', 'timeGrid'],
                defaultView: 'timeGridWeek',
                columnHeaderFormat: {
                    weekday: 'long'
                },
                header: {
                    left: '',
                    center: '',
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
            courseEvents(newEvents) {
                if (this.calendar) {
                    this.calendar.refetchEvents()
                }
            }
        },
        computed: {
            groupedBySubjectCode() {
                const grouped = {}
                for (const course of this.courses) {
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
            hoveredSection () {
                if (this.hoveredCRN === null) return null
                
                return this.courses.map(course => course.sections).flat().find(section => section.crn === this.hoveredCRN)
            },
            hoveredSectionEvents () {
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
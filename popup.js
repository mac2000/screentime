function getToday() {
    return new Date().setHours(0, 0, 0, 0)
}

function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
}

function getStartOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function getStartOfYear() {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1).getTime();
}

function getStartOfPreviousWeek() {
    const startOfWeek = new Date(getStartOfWeek())
    return startOfWeek.setDate(startOfWeek.getDate() - 7)
}

function getEndOfPreviousWeek() {
    const startOfWeek = new Date(getStartOfWeek())
    return startOfWeek.setDate(startOfWeek.getDate() - 1)
}

function getStartOfPreviousMonth() {
    const startOfMonth = new Date(getEndOfPreviousMonth())
    return new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), 1)
}

function getEndOfPreviousMonth() {
    const startOfMonth = new Date(getStartOfMonth())
    return startOfMonth.setDate(startOfMonth.getDate() - 1)
}

function getStartOfPreviousYear() {
    const today = new Date()
    return new Date(today.getFullYear() - 1, 0, 1).getTime()
}

function getEndOfPreviousYear() {
    const today = new Date()
    return new Date(today.getFullYear() - 1, 11, 31).getTime()
}


function humanReadableSeconds(seconds) {
    var levels = [
        [Math.floor(seconds / 31536000), 'years'],
        [Math.floor((seconds % 31536000) / 86400), 'days'],
        [Math.floor(((seconds % 31536000) % 86400) / 3600), 'hours'],
        [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), 'minutes'],
        [(((seconds % 31536000) % 86400) % 3600) % 60, 'seconds'],
    ];
    var returntext = '';

    for (var i = 0, max = levels.length; i < max; i++) {
        if ( levels[i][0] === 0 ) continue;
        returntext += ' ' + levels[i][0] + ' ' + (levels[i][0] === 1 ? levels[i][1].substr(0, levels[i][1].length-1): levels[i][1]);
    };
    return returntext.trim();

    return seconds
    // return moment.duration(seconds, "seconds").humanize();
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function clear() {
    return new Promise((resolve) => {
        chrome.storage.local.get(data => {
            chrome.storage.local.remove(Object.keys(data), resolve)
        })
    })
}

function generate() {
    const domains = ["google.com", "youtube.com", "facebook.com", "amazon.com", "stackoverflow.com"]
    const icons = {
        "amazon.com":"https://www.amazon.com/favicon.ico",
        "facebook.com":"https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico",
        "google.com":"https://www.google.com/favicon.ico",
        "stackoverflow.com":"https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico?v=ec617d715196",
        "youtube.com":"https://www.youtube.com/s/desktop/80e4974c/img/favicon_32.png"
    }
    const today = new Date().setHours(0, 0, 0, 0)
    const days = getRandomInt(5, 14)
    const data = {icons}
    for(let i = 0; i < days; i++) {
        const day = today - i * 24 * 60 * 60 * 1000
        data[day] = {}
        const sites = getRandomInt(0, domains.length / 2)
        for(let x = 0; x < sites; x++) {
            const domain = domains[getRandomInt(1, domains.length - 1)]
            data[day][domain] = getRandomInt(5, 100)
        }
    }
    return data
}

function seed() {
    return new Promise((resolve) => {
        chrome.storage.local.set(generate(), resolve)
    })
}

function download(data, type, filename) {
    const blob = new Blob([data], { type });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function refresh() {
    const period = (document.querySelector("#period button:disabled") || {id: "w2d"}).id
    const start = period === 'w2d' ? getStartOfWeek() : getStartOfPreviousWeek()
    const end = period === 'w2d' ? getToday() : getEndOfPreviousWeek()

    chrome.storage.local.get(data => {
        const {icons} = data
        const allDays = Object.keys(data).filter(key => key.length === 13 && key !== 'domain' && key !== 'timestamp' && key !== 'icons' && /\d{13}/.test(key))
        const days = allDays.map(day => parseInt(day)).filter(day => day >= start && day <= end)
        let seconds = 0
        let min = 9999999999;
        let max = 0
        const domains = {}
        for (let day of days) {
            for (let domain in data[day]) {
                if (data[day].hasOwnProperty(domain)) {
                    domains[domain] = data[day][domain] + (domains[domain] || 0)
                    seconds += data[day][domain]
                    if (data[day][domain] < min) {
                        min = data[day][domain]
                    }
                    if (data[day][domain] > max) {
                        max = data[day][domain]
                    }
                }
            }
        }

        const sortedDomainKeys = Object.keys(domains).sort(function (a, b) {
            return domains[b] - domains[a]
        });
        const avg = Math.round(seconds / sortedDomainKeys.length)

        const chartRaw = days.map(day => ({
            timestamp: day,
            seconds: Object.keys(data[day]).map(domain => data[day][domain]).reduce((a, b) => a + b, 0)
        }))
        const chartMax = Math.max.apply(Math, chartRaw.map(({seconds}) => seconds))
        const chartNormalized = chartRaw.map(({timestamp, seconds}) => ({
            timestamp,
            seconds,
            percent: Math.round(seconds / chartMax * 100)
        }))
        const table = sortedDomainKeys.map(domain => ({
            domain,
            icon: icons ? icons[domain] || 'images/icon48.png' : 'images/icon48.png',
            seconds: domains[domain],
            percent: Math.round( domains[domain] / seconds * 100 )
        }))

        const secondsPerAllDays = allDays.map(day => Object.keys(data[day]).map(domain => data[day][domain]).reduce((a,b) => a+b, 0))
        const allSeconds = secondsPerAllDays.reduce((a,b) => a+b, 0)

        // document.getElementById("chart").innerHTML = chartNormalized.map(({date, seconds, percent}) => `<div title="${new Date(date).toISOString().split('T').shift()} -  ${humanReadableSeconds(seconds)}" style="height:${percent}%"></div>`).join('')

        document.getElementById("days").innerText = days.length.toString()
        document.getElementById("domains").innerText = sortedDomainKeys.length.toString()
        document.getElementById("seconds").innerText = humanReadableSeconds(seconds)
        document.getElementById("max").innerText = humanReadableSeconds(max)
        document.getElementById("avg").innerText = humanReadableSeconds(avg)

        document.getElementById('log').innerHTML = table.map(({
                                                                  icon,
                                                                  domain,
                                                                  seconds,
            percent
                                                              }) => `<tr><td><img src="${icon}" alt="" /></td><td>${domain}<div class="percent" style="width:${percent}%"></div></td><td>${humanReadableSeconds(seconds)}</td></tr>`).join('')

        document.querySelectorAll('.col').forEach(el => el.style.height = 0)
        chartNormalized.forEach(({timestamp, seconds, percent}) => {
            const date = new Date(timestamp)
            const day = date.getDay()
            const col = document.querySelector(`div[data-day="${day}"]`)
            if (col) {
                col.style.height = `${percent}%`
                col.title = date.toISOString().split('T').shift() + ' - ' + humanReadableSeconds(seconds)
            }
        })

        document.getElementById('alldays').innerText = allDays.length.toString()
        document.getElementById('alldomains').innerText = Array.from(new Set(allDays.map(day => Object.keys(data[day])).reduce((acc, x) => acc.concat(x), []))).length.toString()
        document.getElementById('allseconds').innerText = humanReadableSeconds(allSeconds)
        document.getElementById("allmax").innerText = Math.max.apply(Math, secondsPerAllDays).toString()
        document.getElementById("allavg").innerText = humanReadableSeconds(Math.round(allSeconds / secondsPerAllDays.length))
    })

    chrome.storage.local.getBytesInUse(null, bytes => {
        document.getElementById("size").innerText = bytes <= 1024
            ? `${bytes} bytes`
            : bytes <= 1024 * 1024
                ? `${(bytes / 1024).toFixed(2)} kb`
                : `${(bytes / 1024 / 1024).toFixed(2)} mb`
    })
}

if (document) {
    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById("period").addEventListener("click", event => {
            const {tagName} = event.target
            if (tagName !== 'BUTTON') {
                return
            }
            event.preventDefault()
            document.querySelector('#period button:disabled').disabled = false
            event.target.disabled = true
            refresh()
        })
        document.getElementById("clear").addEventListener("click", event => {
            event.preventDefault()
            if (confirm("Are you sure? All data will be deleted")) {
                return clear().then(refresh)
            }
        })

        document.getElementById("seed").addEventListener("click", event => {
            event.preventDefault()
            if (confirm("Are you sure? All data will be overwritten")) {
                return clear().then(seed).then(refresh)
            }
        })

        document.getElementById("json").addEventListener("click", event => {
            event.preventDefault()
            chrome.storage.local.get(data => {
                const { timestamp, domain, icons, ...log } = data
                const json = JSON.stringify(log, null, 4)
                download(json, 'application/json;charset=utf-8;', 'screentime.json')

            })
        })

        document.getElementById("csv").addEventListener("click", event => {
            event.preventDefault()
            chrome.storage.local.get(data => {
                const { timestamp, domain, icons, ...log } = data
                const raw = Object.keys(log).map(day => Object.keys(log[day]).map(domain => ({date: new Date(parseInt(day)).toISOString().split('T').shift(), domain, seconds: log[day][domain]})) ).reduce((acc, x) => acc.concat(x), [])
                const csv = raw.map(({date, domain, seconds}) => [date, domain, seconds].join(",")).join("\r\n")
                download(csv, 'text/csv;charset=utf-8;', 'screentime.csv')
            })
        })

        refresh()
    })
}


// refresh()

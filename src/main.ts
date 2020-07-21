import { get } from 'request-promise'
import * as cheerio from 'cheerio'
import * as puppeteer from 'puppeteer';
import { promises as fs } from 'fs'

let companies: any = {
    "Google": ''
}

let browser: any;
let page: any;

const methods = {
    main: async () => {

        browser = await puppeteer.launch({ headless: true })
        const cookies: any = JSON.parse(await fs.readFile('./cookies/cookies.json', 'utf8'));
        page = await browser.newPage()
        await page.setCookie(...cookies)
        await page.setViewport({
            width: 1500,
            height: 1200,
        });

        let acc: Array<string> = []
        let emails: Array<string> = []

        for (const company of Object.keys(companies)) {
            companies[company] = await methods.fetchCompanyID(company)
            const pages: number = await methods.numPages(companies[company])
            for (let i: number = 1; i <= pages; i++) {
                acc = await methods.getPageContents(company, companies[company], i, acc)
            }
            for (const e of acc) {
                emails.concat(await methods.getEmail(e))
            }
        }
        console.log(emails)
        
    },
    fetchCompanyID: async (company: String): Promise<String> => {
        await page.goto(`https://www.linkedin.com/company/${company}`)
        const $: any = await cheerio.load(await page.content())
        const url: string = $('a[data-control-name="topcard_see_all_employees"]').attr('href')
        let parsedArray: Array<String> = decodeURI(url.slice(44)).replace(new RegExp(`[^0-9 %2C]`, 'gm'), '').split('%2C')
        return `https://www.linkedin.com/search/results/people/?facetCurrentCompany=%5B%22${parsedArray[0]}%22%5D&facetGeoRegion=%5B"us%3A0"%5D&facetIndustry=%5B"104"%5D&facetProfileLanguage=%5B"en"%5D&origin=FACETED_SEARCH&page=1`
    },
    numPages: async (url: String): Promise<number> => {
        await page.goto(url)
        const body: string = await page.content()
        const $: any = await cheerio.load(body)
        return Math.ceil(parseInt($('.search-results__total').text().replace(' results', '')) / 10)
    },
    getPageContents: async (company: string, url: string, p: number, users: Array<string>): Promise<Array<string>> => {
        url = url.concat(`&page=${p}`)
        await page.goto(url)
        const body: string = await page.content()
        const $: any = await cheerio.load(body)
        $('.search-result__result-link').each(async (i, e) => {
            let url = $(e).attr('href')
            if (url == '#') {
                                    /*
                    let element;
                    $('.search-result__truncate').filter((it, elem) => {
                        if (it == i && i % 2 == 0) element = $(elem).text()
                    })
                    if (element) users.push(await methods.fetchFromGoogle(`${element} ${company} "linkedin"`))
                    */
            } else if (users.indexOf(`https://linkedin.com${url}`) < 0) {
                users.push(`https://linkedin.com${url}`)
            }
        })
        return users
    },
    fetchFromGoogle: async (title: string): Promise<string> => {
        let body: string = await get({
            uri: `https://www.google.com/search?gws_rd=ssl&site=&source=hp&q=google&oq=google&q=${title.split(' ').join('+')}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; rv:1.9.2.16) Gecko/20110319 Firefox/3.6.16'
            }
        })
        const $: any = await cheerio.load(body)
        fs.writeFile('test.html', body)
        let data: Array<string> = []
        $('a[href]').filter((i, e) => {
            let url = $(e).attr('href')
            if (url.includes('/url?q=https://www.linkedin.com/in')) data.push(url.slice(7).split('&')[0])
        })
        return data[0]
    },
    getEmail: async (url: string): Promise<Array<string>> => {
        console.log(url)
        url = url.concat(`detail/contact-info/`)
        await page.goto(url)
        let emails: Array<string> = []
        const body: string = await page.content()
        const $: any = await cheerio.load(body)
        $('.pv-contact-info__contact-link').each((i, e) => {
            let href: string = $(e).attr('href')
            if (href.startsWith('mailto:')) {
                emails.push(href.replace('mailto:', ''))
            }
        })
        return emails;
    }
}

/*
setTimeout(async () => {
    const cookies = await page.cookies();
    console.log('saving')
    await fs.writeFile('./cookies/cookies.json', JSON.stringify(cookies, null, 2));
}, 60000)
*/

methods.main()
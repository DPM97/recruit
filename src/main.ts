//import { get } from 'request-promise'
import * as cheerio from 'cheerio'
import * as puppeteer from 'puppeteer';
import { promises as fs } from 'fs'

let companies: any = {
    "Adobe": '',
    "Google": ''
}

let browser: any;
let page: any;

const methods = {
    main: async () => {

        browser = await puppeteer.launch({ headless: false })
        const cookies: any = JSON.parse(await fs.readFile('./cookies/cookies.json', 'utf8'));
        page = await browser.newPage()
        await page.setCookie(...cookies);
        methods.getPageNumber('https://www.linkedin.com/search/results/people/?facetCurrentCompany=%5B%221480%22%5D&facetGeoRegion=%5B"us%3A0"%5D&facetIndustry=%5B"104"%5D&facetProfileLanguage=%5B"en"%5D&origin=FACETED_SEARCH&page=1')
        /*
        for (const company of Object.keys(companies)) {
            companies[company] = await methods.fetchCompanyID(company)
        }
        console.log(companies)
        */
    },
    fetchCompanyID: async (company: String): Promise<String> => {
        await page.goto(`https://www.linkedin.com/company/${company}`)
        const $: any = await cheerio.load(await page.content())
        const url: string = $('a[data-control-name="topcard_see_all_employees"]').attr('href')
        let parsedArray: Array<String> = decodeURI(url.slice(44)).replace(new RegExp(`[^0-9 %2C]`, 'gm'), '').split('%2C')
        return `https://www.linkedin.com/search/results/people/?facetCurrentCompany=%5B%22${parsedArray[0]}%22%5D&facetGeoRegion=%5B"us%3A0"%5D&facetIndustry=%5B"104"%5D&facetProfileLanguage=%5B"en"%5D&origin=FACETED_SEARCH&page=1`
    },
    getPageNumber: async (url: String): Promise<number> => {
        await page.goto(url)
        await page.evaluate(() => { window.scrollBy(0, window.innerHeight) });
        setTimeout(async () => {
            fs.writeFile('test.html', await page.content())

            const $: any = await cheerio.load(await page.content())
            $('button[data-ember-action=""]').map(e => {
                console.log($(e))
                console.log($(e).get('span').text())
            })
        }, 3000)
        return 0;
    }
}

/*
setTimeout(async () => {
    const cookies = await page.cookies();
    console.log('saving')
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
}, 60000)
*/

methods.main()
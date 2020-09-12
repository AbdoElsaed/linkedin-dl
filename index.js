const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const path = require('path');

let args = process.argv.slice(2);
let i = 0;
const root_folder = 'courses';
const course_name = args[1];

(async () => {
    const width = 1600;
    const height = 900;
    const linkedin_home = 'https://www.linkedin.com/';
    const course_landing_page = `https://www.linkedin.com/learning/${course_name}`;
    console.log('>>>', course_landing_page);

    console.log('launching the browser ...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            `--window-size=${width}, ${height}`
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width, height });

        console.log('login to linkedin')
        await page.goto(linkedin_home);
        await page.type('#session_key', args[3]);
        await page.type('#session_password', args[5]);
        await Promise.all([
            page.click('.sign-in-form__submit-button'),
            page.waitForNavigation()
        ]);

        console.log('Heading to Linkedin Learning Page');
        console.log('>>>', course_landing_page);
        await page.goto(course_landing_page);
        await timeout(2000);
        console.log('looking for content section')

        await page.click('.classroom-sidebar-toggle');

        let content = await page.evaluate(() => {
            let divs = [...document.querySelectorAll('.classroom-toc-item__link')];
            return divs.map((div) => div.href)
        })

        await processData(page, content);
        console.log('closing...');
        await browser.close();
        console.log('DONE!');

    } catch (e) {
        console.log(e);
        console.log('closing...');
        await browser.close();
    }
})();

const processData = (page, content) => new Promise(async (resolve, reject) => {
    try {
        if(!content || content.lenght === 0){
            console.log('Did not find any content. there might be two possibilites: \n - Your credentials are wrong \n - The course\'s name is wrong');
            return resolve();
        }

        let dir = `./${root_folder}`
        console.log('dir: ', dir);
        if(!fs.existsSync(dir)) {
            console.log('11111')
            console.log(`Creating folder ${root_folder}`);
            fs.mkdirSync(dir);
        }

        dir = `./${root_folder}/${course_name}`
        if(!fs.existsSync(dir)){
            console.log('22222')
            console.log(`creating folder ${course_name}`);
            fs.mkdirSync(dir);
        }

        for(const el of content){
            await find_uri_and_download(page, el);
        }
        return resolve();
    } catch(e) {
        return reject(e);
    }
});


const find_uri_and_download = (page, content) => new Promise(async (resolve, reject) => {

    try {
        let name = path.basename(content).split('?')[0];
        console.log(`Content name: ${name}`);

        await Promise.all([
            page.goto(content),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);

        let uri = await page.evaluate(() => {
            let src = document.querySelector('.vjs-tech');
            return ((src) ? src.src : null)
        });
        if(!uri){
            console.log('skipping content, src not found...');
            return resolve();
        }
        await Promise.all([
            download_uri(uri, name)
        ]);
        i = i + 1;
        return resolve();
    } catch (err) {
        return reject(err);
    }
});

const download_uri = (uri, name) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(`./${root_folder}/${course_name}/${i}-${name}.mp4`);
    const request = https.get(uri, res => {
        res.pipe(file);
        console.log(`Finished downloading ${name}`);
        return resolve();
    });
});

const timeout = ms => new Promise(res => setTimeout(res, ms))
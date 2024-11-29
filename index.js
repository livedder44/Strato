const  = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // Необхідно для Render
  });

  const page = await browser.newPage();

  const startUrl = 'https://www.aviationpartsinc.com/product-category/aircraft-parts/cessna-beechcraft/';
  await page.goto(startUrl, { waitUntil: 'networkidle2' });

  const results = [];

  async function scrapePage() {
    // Отримання посилань на продукти
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.product-loop-header a.woocommerce-LoopProduct-link')).map(link => link.href)
    );

    for (const link of links) {
      await page.goto(link, { waitUntil: 'networkidle2' });

      const data = await page.evaluate(() => {
        const getText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.innerText.trim() : null;
        };

        const getAttribute = (selector, attr) => {
          const element = document.querySelector(selector);
          return element ? element.getAttribute(attr) : null;
        };

        return {
          Title: getText('h1'),
          "Body (HTML)": getText('.electro-description td'),
          "Product Category": getText('span.posted_in'),
          Tags: getText('span.tagged_as'),
          tags2: getText('.summary span.loop-product-categories'),
          "Variant SKU": getText('.woocommerce-product-details__short-description td'),
          "Variant SKU2": getText('div.summary'),
          image1: getAttribute('img.attachment-shop_single', 'src'),
          image2: Array.from(document.querySelectorAll('img.attachment-shop_thumbnail')).map(img => img.src),
          weight: getText('.woocommerce-product-attributes-item--weight td'),
          Dimensions: getText('.woocommerce-product-attributes-item--dimensions td'),
          "Variant Price": Array.from(document.querySelectorAll('.woocommerce-variation-price bdi')).map(price => price.innerText.trim()),
          "Variant Price 2": getText('p bdi'),
        };
      });

      results.push(data);
    }

    // Перевірка наявності кнопки для пагінації
    const nextPageButton = await page.$('.electro-advanced-pagination a');
    if (nextPageButton) {
      await Promise.all([
        nextPageButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      await scrapePage(); // Рекурсивний виклик
    }
  }

  await scrapePage();

  await browser.close();

  console.log(results); // Виводимо результати в консоль
})();

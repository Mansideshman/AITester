import{test,expect, Locator} from '@playwright/test';



test.describe('Verify SVG elements',async()=>

{
    //Verify SVG for Flipkart product

    test('verify SVG related task1',async({page})=>
    {

    await page.goto("https://www.flipkart.com/search");
    await page.locator('input[type="text"]').fill('macmini');
    const svgElements:Locator=page.locator('svg');
    await svgElements.first().click();
    await page.waitForLoadState('networkidle'); // Wait for the search results to load

    // Sort the results by clickin on "Price -- Low to High" 
    await page.getByText('Price -- Low to High').click();
    await page.waitForLoadState('networkidle'); // Wait for the sorted results to load

    // Validate that the first product in the sorted results is visible and print its title
    const firstResult: Locator = page.locator('//div[contains(@data-id,"CPU")]/div/a[2]');
    await expect(firstResult.first()).toBeVisible({ timeout: 15000 });
    console.log(`Cheapest product title: ${await firstResult.first().textContent()}`);

    // Validate that the price of the first product is visible and print it
    const firstResultPrice: Locator = page.locator('(//div[contains(@data-id,"CPU")]/div/a/div/div)[3]');
    await expect(firstResultPrice.first()).toBeVisible({ timeout: 15000 });
    const cheapestProductTitle: string | null = await firstResultPrice.first().textContent();
    console.log(`Cheapest Macmini: ${cheapestProductTitle}`);
    await page.waitForTimeout(2000);
    });

     //Verify SVG for Maps

     test('Verify Map',async({page})=>
    {

        await page.goto("https://simplemaps.com/svg/country/in");
        //Print all the class names of the states and click on UP

        const states = await page.locator(`//div[@id='admin1_map_inner']//*[name()='svg']//*[name()='text' and contains(@class,'sm_label')]`).allTextContents();

        // Printing all 36 states and clicking on UP
        for (const state of states) {
          console.log(state.trim());
          if (state.trim() === "Uttar Pradesh") {
            await page.locator(`//*[name()='path' and contains(@class,'INUP')]`).click();
            break;
          }
        }
    });
});
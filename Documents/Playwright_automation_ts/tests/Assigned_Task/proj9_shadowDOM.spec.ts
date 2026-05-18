import{test,expect} from '@playwright/test';



test.describe('Verify Shadow DOM related test',async()=>

{

    test('verify Shadow DOM related test',async({page})=>
    {
        await page.goto("https://selectorshub.com/xpath-practice-page/")
        await page.getByPlaceholder('enter name' ).fill('Mansi');
        await page.getByPlaceholder('Enter pizza name' ).fill('Pery Pery Pizza');
        await page.getByPlaceholder('enter password').fill('password@123');
        await page.waitForTimeout(5000);

     });
    
}
);
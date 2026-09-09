import { test, expect } from '@playwright/test';

test('held branches and pending weaves are visible directly on the map',async({page})=>{
  await page.goto('/?noDraft=1');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Branch from here'}).click();
  await view.getByLabel('Path name').fill('Keep the alternate boundary');
  await view.getByLabel('What should the next walk attend to?').fill('Follow the alternate boundary without collapsing it into the first line.');
  await view.getByRole('button',{name:'Save path'}).click();
  await expect(view.getByRole('button',{name:/Held branch: Keep the alternate boundary/})).toBeVisible();

  await page.goto('/?flightLines=1&noDraft=1');const woven=page.frameLocator('#view');
  await woven.getByRole('button',{name:/Compare paths/}).click();
  const choices=woven.locator('.line-choice input:not(:disabled)');for(let i=0;i<await choices.count();i++)await choices.nth(i).check();
  await woven.getByLabel('What do you want to compare?').fill('Do the developed lines preserve the same authority invariant?');
  await woven.getByRole('button',{name:'Save comparison'}).click();
  const layerToggles=woven.locator('.layer-bar input[type="checkbox"]');await expect(layerToggles).toHaveCount(4);await layerToggles.nth(3).check();
  await expect(woven.getByRole('button',{name:/Weave waiting: Do the developed lines preserve/})).toBeVisible();
});

test('re-walks expose declared traversal context without claiming replay',async({page})=>{
  await page.goto('/?rewalk=1');const view=page.frameLocator('#view');
  const arrival=view.getByRole('button',{name:/Visited arrival: A later traversal foregrounds changed conditions/});
  await expect(arrival).toBeVisible();await arrival.click();
  await expect(view.getByRole('heading',{name:'Re-walk conditions'})).toBeVisible();
  await expect(view.getByText('model: GPT-5.6 Sol',{exact:true})).toBeVisible();
  await expect(view.getByText('not a replay or reproducibility guarantee',{exact:false})).toBeVisible();
  expect(await view.locator('.edge.rewalk').count()).toBeGreaterThan(0);
});

import { test, expect } from '@playwright/test';

const enableAll=async(view:ReturnType<Parameters<typeof test>[0]> extends never ? never : any)=>{
  for(const name of ['Evidence','Structure','Operations','Encounters'])await view.getByLabel(new RegExp(`^${name}`)).check();
};

test('phase3 layer controls reveal structural features',async({page})=>{
  await page.goto('/?flightLines=1');const view=page.frameLocator('#view');
  await expect(view.getByRole('button',{name:/Structural pressure: External authority arrives asynchronously/})).toHaveCount(0);
  await enableAll(view);
  await expect(view.getByRole('button',{name:/Grounded observation: A real deployment constraint surfaced/})).toBeVisible();
  await expect(view.getByRole('button',{name:/Structural pressure: External authority arrives asynchronously/})).toBeVisible();
  await expect(view.getByRole('button',{name:/Operation: Selective boundary protocol/})).toBeVisible();
  await expect(view.getByRole('button',{name:/Operation in motion: Treat external reconciliation/})).toBeVisible();
  await expect(view.getByRole('button',{name:/Encounter \/ weave: The two lines disagree/})).toBeVisible();
});

test('phase3 revealed layer details remain inspectable',async({page})=>{
  await page.goto('/?flightLines=1');const view=page.frameLocator('#view');
  await enableAll(view);
  await view.getByRole('button',{name:/Structural pressure: External authority arrives asynchronously/}).click();
  await expect(view.getByRole('heading',{name:'External authority arrives asynchronously'})).toBeVisible();
  await expect(view.getByText('Fixture human report')).toBeVisible();
  await view.getByRole('button',{name:/Operation: Selective boundary protocol/}).click();
  await expect(view.getByText('Cell membranes / message-passing systems')).toBeVisible();
  await expect(view.getByRole('heading',{name:'Executable procedure'})).toBeVisible();
  await view.getByRole('button',{name:/Encounter \/ weave: The two lines disagree/}).click();
  await expect(view.getByText('ENCOUNTER / WEAVE · mismatch')).toBeVisible();
  await expect(view.getByText('Resonance proposes; it does not prove.')).toBeVisible();
});

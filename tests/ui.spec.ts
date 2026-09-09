import { test, expect } from '@playwright/test';

test('human Keep this updates the actual store and does not prepare a next move',async({page,request})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Keep this',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Kept.');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(2);expect(snapshot.positions[1].epistemicStatus).toBe('hypothesis');expect(snapshot.activeMove).toBeNull();
  expect(snapshot.positions[1].semanticShift.newlySalient[0].span).toBe('mismatch');
  expect(snapshot.cartography.waypoints).toHaveLength(1);expect(snapshot.cartography.waypoints[0].status).toBe('sensed');
  await expect(view.getByRole('button',{name:/Unvisited direction: What would a mismatch invite us to ask next/})).toBeVisible();
});
test('missing private metadata leaves review disabled',async({page})=>{
  await page.goto('/?noMeta=1');const view=page.frameLocator('#view');
  await expect(view.getByText('Review authorization is unavailable or stale.',{exact:false})).toBeVisible();
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeDisabled();
});
test('structured editing requires a saved revision before Keep this',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Change it',exact:true}).click();
  const editor=view.getByLabel('Main idea');await expect(editor).toBeVisible();
  await editor.fill('A human-revised hypothesis.');
  await expect(view.getByRole('button',{name:'Save revision',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Save revision',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Revision saved');
  await expect(view.getByRole('button',{name:'Keep this',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Keep this',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Kept.');
});
test('Save for later does not add a generated arrival',async({page,request})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Save for later',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Saved for later');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(1);expect(snapshot.drafts[0].status).toBe('reserved');expect(snapshot.activeMove).toBeNull();
});
test('map exposes semantic-shift hover/focus copy and an unvisited hollow direction',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  const proposed=view.getByRole('button',{name:/Proposed arrival:/});await proposed.focus();
  const detail=view.locator('.detail-card');
  await expect(detail.getByText('What entered',{exact:true})).toBeVisible();
  await expect(detail.getByText('mismatch',{exact:true})).toBeVisible();
});

test('Flight Lines structural ecology is visible as map features rather than raw records',async({page})=>{
  await page.goto('/?flightLines=1');const view=page.frameLocator('#view');
  const observation=view.getByRole('button',{name:/Grounded observation: A real deployment constraint surfaced/});
  const constraint=view.getByRole('button',{name:/Structural pressure: External authority arrives asynchronously/});
  const operation=view.getByRole('button',{name:/Operation: Selective boundary protocol/});
  const application=view.getByRole('button',{name:/Operation in motion: Treat external reconciliation/});
  const encounter=view.getByRole('button',{name:/Encounter \/ weave: The two lines disagree/});
  await expect(observation).toBeVisible();await expect(constraint).toBeVisible();await expect(operation).toBeVisible();await expect(application).toBeVisible();await expect(encounter).toBeVisible();
  await constraint.click();await expect(view.getByRole('heading',{name:'External authority arrives asynchronously'})).toBeVisible();await expect(view.getByText('Fixture human report')).toBeVisible();
  await operation.click();await expect(view.getByText('Cell membranes / message-passing systems')).toBeVisible();await expect(view.getByRole('heading',{name:'Executable procedure'})).toBeVisible();
  await encounter.click();await expect(view.getByText('ENCOUNTER / WEAVE · mismatch')).toBeVisible();await expect(view.getByText('Resonance proposes; it does not prove.')).toBeVisible();
});

test('human can preserve a branch intention without visiting new territory',async({page,request})=>{await page.goto('/?noDraft=1');const view=page.frameLocator('#view');const branch=view.getByRole('button',{name:'Branch from here'});await expect(branch).toBeVisible();await page.waitForTimeout(100);await branch.click();await view.getByLabel('Path name').fill('Follow the blind spot');await view.getByLabel('What should the next walk attend to?').fill('Attend to what the current framing keeps excluding.');await view.getByRole('button',{name:'Save path'}).click();await expect(view.getByRole('status')).toContainText('Path saved');const id=await page.locator('body').getAttribute('data-exploration-id');const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();expect(snapshot.positions).toHaveLength(1);expect(snapshot.activeMove).toBeNull();expect(snapshot.cartography.lines).toHaveLength(2);expect(snapshot.cartography.gestureRequests.at(-1).kind).toBe('branch');await expect(view.getByRole('heading',{name:'Ready when you return to chat'})).toBeVisible();await expect(view.getByText('Resume the saved path “Follow the blind spot”.')).toBeVisible();});

test('review-first shell names the exploration and makes the pending decision primary',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await expect(view.getByRole('heading',{name:'A discovery walk',exact:true})).toBeVisible();
  await expect(view.getByText('REVIEW NEEDED',{exact:true}).first()).toBeVisible();
  await expect(view.getByRole('heading',{name:'A proposed step is waiting for you.',exact:true})).toBeVisible();
  await expect(view.locator('.review-first-card + .map-layout')).toHaveCount(1);
  await expect(view.getByText('What changed',{exact:true}).first()).toBeVisible();
  await expect(view.getByText('What this opens',{exact:true}).first()).toBeVisible();
  await expect(view.getByText('What we’re unsure about',{exact:true}).first()).toBeVisible();
});

test('editing keeps domain-heavy controls behind advanced disclosure',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Change it',exact:true}).click();
  await expect(view.getByLabel('Main idea')).toBeVisible();
  const advanced=view.locator('details.advanced-editor');
  await expect(advanced).toBeVisible();
  await expect(advanced).not.toHaveAttribute('open','');
  await advanced.locator('summary').click();
  await expect(advanced).toHaveAttribute('open','');
  await expect(view.getByLabel('New language / spans (comma separated)')).toBeVisible();
});

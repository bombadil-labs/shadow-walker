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

test('Flight Lines structural ecology is available as optional map layers',async({page})=>{
  await page.goto('/?flightLines=1');const view=page.frameLocator('#view');
  await expect(view.getByRole('button',{name:/Structural pressure: External authority arrives asynchronously/})).toHaveCount(0);
  for(const name of ['Evidence','Structure','Operations','Encounters'])await view.getByLabel(new RegExp(`^${name}`)).check();
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

test('map is left-to-right and keeps core territory readable by default',async({page})=>{
  await page.goto('/?rewalk=1');const view=page.frameLocator('#view');
  await expect(view.getByLabel('Territory legend')).toContainText('Accepted step');
  const root=view.locator('.map-node.root');const frontier=view.locator('.map-node.arrival:not(.root)').last();
  const rootLeft=Number.parseFloat(await root.evaluate(el=>(el as HTMLElement).style.left));
  const frontierLeft=Number.parseFloat(await frontier.evaluate(el=>(el as HTMLElement).style.left));
  expect(frontierLeft).toBeGreaterThan(rootLeft);
  await expect(view.getByRole('button',{name:'Fit map'})).toBeVisible();
  await expect(view.getByRole('button',{name:'Focus current'})).toBeVisible();
});

test('outline shares selection with the map and reads paths as a list',async({page})=>{
  await page.goto('/?flightLines=1&noDraft=1');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Outline',exact:true}).click();
  await expect(view.getByRole('region',{name:'Exploration outline'})).toBeVisible();
  const item=view.getByRole('button',{name:/Accepted step: Another line distributes reconciliation across participants/});
  await item.click();
  await expect(view.getByRole('heading',{name:'Another line distributes reconciliation across participants.'})).toBeVisible();
  await view.getByRole('button',{name:'Map',exact:true}).click();
  await expect(view.getByRole('button',{name:/Visited arrival: Another line distributes reconciliation across participants/})).toHaveClass(/selected/);
});

test('map uses task language while keeping Shadow Walker terms secondary',async({page})=>{
  await page.goto('/?noDraft=1');const view=page.frameLocator('#view');
  await expect(view.getByRole('heading',{name:'1 accepted step'})).toBeVisible();
  await expect(view.getByText('FROM THIS STEP · BRANCH')).toBeVisible();
  await expect(view.getByRole('button',{name:'Branch from here'})).toBeVisible();
});

test('human can preserve a branch intention without visiting new territory',async({page,request})=>{
  await page.goto('/?noDraft=1');const view=page.frameLocator('#view');
  const branch=view.getByRole('button',{name:'Branch from here'});await expect(branch).toBeVisible();await page.waitForTimeout(100);await branch.click();
  await view.getByLabel('Path name').fill('Follow the blind spot');
  await view.getByLabel('What should the next walk attend to?').fill('Attend to what the current framing keeps excluding.');
  await view.getByRole('button',{name:'Save path'}).click();
  await expect(view.getByRole('status')).toContainText('Path saved');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(1);expect(snapshot.activeMove).toBeNull();expect(snapshot.cartography.lines).toHaveLength(2);expect(snapshot.cartography.gestureRequests.at(-1).kind).toBe('branch');
  const saved=view.locator('.saved-directions-card');await expect(saved).toBeVisible();
  await expect(saved.getByText('Follow the blind spot',{exact:true})).toBeVisible();
  await expect(saved.locator('.chat-handoff q')).toContainText('Resume the saved path');
});

test('human can request a weave across developed lines without creating an encounter',async({page,request})=>{
  await page.goto('/?flightLines=1&noDraft=1');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:/Compare paths/}).click();
  const choices=view.locator('.line-choice input:not(:disabled)');expect(await choices.count()).toBeGreaterThanOrEqual(2);
  for(let i=0;i<await choices.count();i++)await choices.nth(i).check();
  await view.getByLabel('What do you want to compare?').fill('Do these lines preserve the same invariant, or merely use similar language?');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const before=await (await request.get(`/snapshot?id=${id}`)).json();
  await view.getByRole('button',{name:'Save comparison'}).click();
  await expect(view.getByRole('status')).toContainText('Comparison saved');
  const after=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(after.cartography.encounters).toHaveLength(before.cartography.encounters.length);expect(after.cartography.gestureRequests.at(-1).kind).toBe('weave');expect(after.cartography.weaveProposals).toHaveLength(0);
  const saved=view.locator('.saved-directions-card');await expect(saved).toBeVisible();await expect(saved.getByText('Saved comparison · Weave')).toBeVisible();
});

test('human review is required before a conversational weave becomes an encounter',async({page,request})=>{
  await page.goto('/?flightLines=1&weaveReview=1');const view=page.frameLocator('#view');
  await expect(view.getByText('PROPOSED RELATIONSHIP · WEAVE · REVISION 1')).toBeVisible();
  await expect(view.getByRole('button',{name:'Keep relationship'})).toBeEnabled();
  const id=await page.locator('body').getAttribute('data-exploration-id');const before=await (await request.get(`/snapshot?id=${id}`)).json();
  await view.getByRole('button',{name:'Keep relationship'}).click();
  await expect(view.getByRole('status')).toContainText('Comparison kept as a candidate encounter');
  const after=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(after.cartography.encounters).toHaveLength(before.cartography.encounters.length+1);expect(after.cartography.weaveProposals.at(-1).status).toBe('kept');expect(after.activeMove).toBeNull();
});

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

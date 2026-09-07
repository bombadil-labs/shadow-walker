import { test, expect } from '@playwright/test';
import type { MoveOutput } from '../packages/domain/src/index.ts';

test('human Land updates the actual store and does not prepare a next move',async({page,request})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await expect(view.getByRole('button',{name:'Land',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Land',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Step landed');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(2);expect(snapshot.positions[1].epistemicStatus).toBe('hypothesis');expect(snapshot.activeMove).toBeNull();
});
test('missing private metadata leaves Land disabled',async({page})=>{
  await page.goto('/?noMeta=1');const view=page.frameLocator('#view');
  await expect(view.getByText('No review capability was delivered.',{exact:false})).toBeVisible();
  await expect(view.getByRole('button',{name:'Land',exact:true})).toBeDisabled();
});
test('editing requires Revise before a separate Land',async({page})=>{
  await page.goto('/');const view=page.frameLocator('#view');const editor=view.getByLabel('Edit the full draft (JSON)');
  await expect(editor).toBeVisible();const output=JSON.parse(await editor.inputValue()) as MoveOutput;
  output.positions[0]!.meaning='A human-revised hypothesis.';await editor.fill(JSON.stringify(output,null,2));
  await expect(view.getByRole('button',{name:'Land',exact:true})).toBeDisabled();
  await view.getByRole('button',{name:'Revise',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Revision saved');
  await expect(view.getByRole('button',{name:'Land',exact:true})).toBeEnabled();
  await view.getByRole('button',{name:'Land',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Step landed');
});
test('Keep in reserve does not add a generated position',async({page,request})=>{
  await page.goto('/');const view=page.frameLocator('#view');
  await view.getByRole('button',{name:'Keep in reserve',exact:true}).click();
  await expect(view.getByRole('status')).toContainText('Kept in reserve');
  const id=await page.locator('body').getAttribute('data-exploration-id');
  const snapshot=await (await request.get(`/snapshot?id=${id}`)).json();
  expect(snapshot.positions).toHaveLength(1);expect(snapshot.drafts[0].status).toBe('reserved');expect(snapshot.activeMove).toBeNull();
});

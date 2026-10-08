const { chromium } = require('C:/Users/piryt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const output = path.join(__dirname, 'qa'); fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'], executablePath: process.env.NEUROATLAS_CHROME || undefined});
  const result = [];
  for (const detail of ['low','high']) {
    const page=await browser.newPage({viewport:{width:1440,height:960}}), errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.error('APP:',e.message);});
    page.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&!/GPU|WebGL|software|ReadPixels|performance|deprecated/i.test(m.text())))errors.push(m.text());});
    await page.goto(`${process.env.NEUROATLAS_URL || 'http://127.0.0.1:8877'}/?detail=${detail}`);
    await page.locator('#loading').waitFor({state:'hidden',timeout:120000});
    const modes=await page.locator('.nav-tab').evaluateAll(items=>items.map(x=>x.dataset.mode));
    for (const mode of modes) {
      console.log(detail,mode);
      await page.locator(`.nav-tab[data-mode="${mode}"]`).click();
      await page.waitForTimeout(180);
      if (mode==='atlas') {await page.locator('.structure-item[data-select="lh-caudalmiddlefrontal"]').click();await page.locator('[data-atlas-connections]').click();await page.locator('[data-atlas-connections]').click();}
      if (mode==='research') {await page.locator('[data-research-comparison]').click();await page.locator('[data-method-answer="eeg"]').click();await page.locator('[data-method-next]').click();await page.locator('[data-research-method="mri"]').click();}
      if (mode==='transmitters') {
        await page.locator('[data-transmitter-view="transport"]').click();
        await page.locator('#transmitter-select').selectOption('serotonin');
        await page.locator('#transmitter-drug').selectOption('ssri');
        await page.locator('[data-transmitter-view="projection"]').click();
        await page.locator('#transmitter-select').selectOption('dopamine');
      }
      if (mode==='dissection') {
        await page.waitForFunction(()=>document.querySelector('#ortho-position')?.textContent.includes('mm'),{},{timeout:60000});
        await page.locator('[data-ortho="coronal"]').click({position:{x:120,y:135}});
        await page.locator('[data-ortho="coronal"]').press('ArrowRight');
      }
      if (mode==='detailed') {
        await page.locator('#detail-division').selectOption('network');
        await page.waitForFunction(()=>!document.querySelector('.detail-panel')?.textContent.includes('Wczytywanie etykiet'));
        await page.locator('[data-detail-mapid="7"]').click();
        await page.locator('#detail-division').selectOption('brodmann');
        await page.locator('[data-detail-hemi="rh"]').click();
        await page.screenshot({path:path.join(output,`${detail}-detailed.png`)});
        await page.locator('#detail-division').selectOption('dk');
      }
      if (mode==='impulse') {
        await page.locator('[data-phys-scope="membrane"]').click();
        await page.locator('[data-phys-epsp="0"]').click();await page.waitForTimeout(400);
        if(!/czynnościowe: 0/.test(await page.locator('#membrane-result').textContent()))throw Error('Pojedynczy EPSP przekroczył próg');
        await page.locator('[data-phys-sum]').click();
        await page.waitForFunction(()=>document.querySelector('#membrane-result')?.textContent.includes('czynnościowe: 1'));
        await page.screenshot({path:path.join(output,`${detail}-membrane.png`)});
        await page.locator('[data-phys-scope="pathology"]').click();
        await page.locator('#pathology-scenario').selectOption('lidocaine');
        await page.locator('#phys-speed').focus();await page.locator('#phys-speed').press('End');await page.locator('#pathology-severity').focus();await page.locator('#pathology-severity').press('End');
        await page.waitForFunction(()=>document.querySelector('#pathology-result')?.textContent.includes('sygnał wygasł'),{},{timeout:60000});
        await page.locator('[data-lab-scope="micro"]').click();
        await page.locator('[data-lab-follow]').click();await page.locator('[data-lab-follow]').click();
        await page.locator('[data-lab-scope="macro"]').click();
      }
      if (mode==='vascular') {
        await page.locator('button[data-vasc-artery="ACA"]').click();
        await page.locator('[data-vasc-hemi="rh"]').click();await page.locator('[data-vasc-watershed]').click();
        await page.locator('[data-vasc-answer="MCA"]').click();await page.locator('[data-vasc-next]').click();
        await page.locator('#section').selectOption('coronal');
        await page.locator('#vascular-separation').focus();await page.locator('#vascular-separation').press('ArrowRight');
        await page.screenshot({path:path.join(output,`${detail}-vascular.png`)});
      }
      if (mode==='networks') {
        await page.waitForFunction(()=>!document.querySelector('.networks-panel')?.textContent.includes('Wczytywanie adnotacji'));
        await page.locator('[data-net-multi]').click();await page.locator('[data-net-select="visual"]').click();
        await page.locator('[data-net-task="salient"]').click();
        await page.locator('#section').selectOption('axial');
        await page.locator('#network-separation').focus();await page.locator('#network-separation').press('ArrowRight');
        await page.screenshot({path:path.join(output,`${detail}-networks.png`)});
      }
      if(['atlas','research','transmitters'].includes(mode)) await page.screenshot({path:path.join(output,`${detail}-${mode}.png`)});
    }
    for(const width of [1000,400]) {
      await page.setViewportSize({width,height:960});
      await page.locator('.nav-tab[data-mode="research"]').click();await page.locator('[data-research-comparison]').click();
      await page.screenshot({path:path.join(output,`${detail}-${width}.png`)});
      result.push({detail,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
    }
    result.push({detail,errors});await page.close();
  }
  await browser.close();fs.writeFileSync(path.join(output,process.env.NEUROATLAS_STAGE || 'stage1.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});

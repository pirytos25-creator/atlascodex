const {chromium}=require('C:/Users/piryt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const out=path.join(__dirname,'qa');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.NEUROATLAS_CHROME,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
 for(const detail of ['low','high']){
  const errors=[],page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`${process.env.NEUROATLAS_URL || 'http://127.0.0.1:8877'}/?detail=${detail}&tab=tests`);await page.locator('#loading').waitFor({state:'hidden',timeout:120000});await page.locator('.tests-panel').waitFor();
  for(const task of ['interference','trails','fluency','sorting']){
   console.log(detail,task);await page.locator('#test-task').selectOption(task);
   for(const training of [true,false]){
    await page.locator('#mode-panel '+(training?'[data-test-train]':'[data-test-main]')).click();
    if(task==='interference'||task==='sorting'){
     const count=training?4:task==='sorting'?18:20;
     for(let i=0;i<count;i++){
      let answer;
      if(task==='interference')answer=await page.locator('[data-ink]').getAttribute('data-ink');
      else{const field=training?'color':['color','shape','quantity'][Math.floor(i/6)];answer=await page.locator('.sorting-stimulus').getAttribute('data-'+field);}
      if(task==='sorting'&&i===0){await page.keyboard.press('4');if(await page.locator('.sorting-stimulus').count()!==1)throw Error('Invalid sorting key advanced trial');}
      await page.locator(`.tests-board [data-test-answer="${answer}"]`).click();
     }
     const text=await page.locator('#mode-panel').textContent();if(!text.includes(`Poprawne: ${count} / ${count}`))throw Error('Wrong answers or count '+task);
    }
    if(task==='trails'){
     for(const part of ['A','B']){if(part==='B')await page.locator('[data-test-part]').click();for(let i=0;i<(training?4:12);i++)await page.locator(`[data-test-node="${i}"]`).click();}
     if(!(await page.locator('#mode-panel').textContent()).includes('błędne kliknięcia: 0'))throw Error('Trail errors');
    }
    if(task==='fluency'){
     for(const word of ['pies','pies','kot','puma']){await page.locator('#test-word').fill(word);await page.locator('#test-word').press('Enter');}
     await page.locator('#mode-panel [data-test-pause]').click();await page.waitForTimeout(350);await page.locator('[data-test-resume]').click();await page.locator('[data-test-finish]').click();
     const summary=await page.locator('.lab-stage').textContent();if(!summary.includes('Różne odpowiedzi: 2')||!summary.includes('powtórzenia: 1')||!summary.includes('odrzucone wpisy: 1'))throw Error('Fluency validation');
     await page.locator('#test-fluency-kind').selectOption('category');if(await page.locator('.lab-stage').textContent()!==summary)throw Error('Finished fluency clock changed');
     // Variant change invalidates the training; restore and train for main.
     if(training){await page.locator('#test-fluency-kind').selectOption('letter');await page.locator('#mode-panel [data-test-train]').click();await page.locator('[data-test-finish]').click();}
    }
    await page.locator('.task-card').waitFor();
   }
  }
  await page.screenshot({path:path.join(out,detail+'-tests.png')});
  await page.locator('.nav-tab[data-mode="comparative"]').click();await page.waitForFunction(()=>document.querySelector('.comparative-labels')?.textContent.includes('Siatka atlasu Waxholm'),{},{timeout:60000});await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(out,detail+'-comparative.png')});
  for(const region of ['olfactory','cerebellum','hippocampus','pfc'])await page.locator('#compare-region').selectOption(region);
  await page.locator('[data-compare-scale="physical"]').click();await page.screenshot({path:path.join(out,detail+'-comparative-physical.png')});
  for(const species of ['macaque','dog','cat','rat']){await page.locator('#compare-b').selectOption(species);await page.locator('[data-compare-scale="normalized"]').click();}
  for(const width of [1000,400]){
   await page.setViewportSize({width,height:960});
   for(const mode of ['tests','comparative','vascular','networks']){await page.locator(`.nav-tab[data-mode="${mode}"]`).click();await page.waitForTimeout(900);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error(mode+' overflow '+width);await page.screenshot({path:path.join(out,`${detail}-${mode}-${width}.png`)});results.push({detail,width,mode,overflow});}
  }
  results.push({detail,errors});if(errors.length)throw Error(errors.join('\n'));await page.close();
 }
 await browser.close();fs.writeFileSync(path.join(out,'stage5.json'),JSON.stringify(results,null,2));console.log('PASS',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});

import { defineAdobeAccountTests, expect } from '../../src/adobe/spec';
import { ADOBE_LINK_ATTACHMENT } from '../../src/adobe/runtime';
import { AdobePage } from "../../src/pages/adobe";
import { GmailProvider } from "../../src/pages/gmailProvider";
import { MsProvider} from "../../src/pages/msProvider";
import { EditorDashboard } from '../../src/pages/editorDashboard';

const FIXED_POSTCARD_URL = 'https://new.express.adobe.com/design/template/urn:aaid:sc:VA6C2:f2c97bf0-1039-5b0d-be7a-528c0060757b?category=text&entryPoint=template&taskID=postcard';

defineAdobeAccountTests('script flow', async ({ page, context, account, stepTracker }, testInfo) => {
    // Stamped first so the share→publish retry can tell how much of testInfo.timeout is
    // left before it commits to another attempt.
    const testStartedAt = Date.now();
    const adobe = new AdobePage(page);
    let editor: EditorDashboard;   // bound to the postcard tab once it opens
    const ms = new MsProvider(page);
    const ggl = new GmailProvider(page);

  // Start intercepting UDS requests to capture auth credentials for API-based Let's Go dismissal
  adobe.startUdsCapture();

  stepTracker.setStep('open login');
  await adobe.adb_login()

  stepTracker.setStep('Enter email at Adobe Login');
  await adobe.fill_adb_email_field(account.email);

  stepTracker.setStep('Handle Personal/Company screen on Adobe Login');
  await adobe.select_cmp_option();

  stepTracker.setStep('check email provider');
  const provider  =  await adobe.getLoginProvider();

  stepTracker.setStep('Login with'+ provider);
  if(provider.includes('accounts.google.com')){
        await ggl.g_login(account.email,account.password);
  } else if (provider.includes('login.microsoftonline.com')){
        await ms.ms_login(account.email,account.password);
  }

  stepTracker.setStep('Wait for Adobe Dashboard');
  await adobe.waitForDashboard();

  stepTracker.setStep('Activate by Lets Go');
  await adobe.skipLetsGoViaAPI(account.email);

  stepTracker.setStep('Navigate to Fixed Postcard');
  // Settle buffer to let late dashboard content/interrupts render.
  await page.waitForTimeout(1200);
  const postcardPage = await context.newPage();
  await postcardPage.goto(FIXED_POSTCARD_URL, { waitUntil: 'load' });
  editor = new EditorDashboard(postcardPage);   // rebind; original tab stays open


  // ── OLD flow (blank Square canvas → search inside editor) — replaced by v7's dashboard search ──
  // stepTracker.setStep('Setup Canvas');
  // await adobe.createTemplate();

  // stepTracker.setStep('Search Template');
  // const keyword: string = adobe.getRandomSearchKeyword()
  // await adobe.searchForTemplate(keyword);

  // stepTracker.setStep('Select Template');
  // await adobe.selectTemplate(keyword);

  // // ── NEW flow (from v7): search templates on the dashboard, click a random result ──
  // stepTracker.setStep('Search Template');
  // await adobe.searchDashboardTemplate('Postcard');
  //
  // stepTracker.setStep('Select Template');
  // await adobe.selectRandomTemplate();

  // The editor's tutorial/coachmark still appears after a template opens; skipTutorial
  // registers a persistent "Skip tour" handler that also protects the Share click.
  stepTracker.setStep('Skip Tutorial dialog if visible');
  await editor.skipTutorial();

  // stepTracker.setStep('Redirect to edit');
  // await adobe.shortcut();
  
  // stepTracker.setStep('Wait for Img Generation');
  // await adobe.wait_for_generation();

  // stepTracker.setStep('Open In Editor');
  // await editor.clickOpenInEditor();


  // Share → publish produced 33 of 42 failures in the 2026-08-05 run, and they were
  // transient (bursty, both workers at once) rather than account-specific — so run the
  // leg with a reset-and-retry instead of a single pass. onStep keeps the CSV's
  // failed_at_step as granular as the three separate setStep calls it replaces, and
  // budgetLeftMs stops a retry that could not finish inside the test timeout.
  await editor.sharePublishWithRetry({
    onStep: (step) => stepTracker.setStep(step),
    budgetLeftMs: () => testInfo.timeout - (Date.now() - testStartedAt),
  });

  stepTracker.setStep('Click Copy Link button');
  const link = await editor.clickCopyLink();
  console.log('Link Copied: ' + link);
  expect(link).toBeTruthy();

  // Attach published link to test results for CSV report
  await testInfo.attach(ADOBE_LINK_ATTACHMENT, {
    body: Buffer.from(JSON.stringify({ publishedLink: link }), 'utf8'),
    contentType: 'application/json',
  });


  // Downloads from `editor`, not `adobe`: the design is on the postcard tab while AdobePage
  // stays bound to the login tab. adobe.download_img() looked there — which is why every
  // account in the 2026-08-18 run failed at this step — and it also still clicked the
  // Firefly-era 'Selected image' radio, which this editor's download panel does not have.
  // Both confirmed live by tests/adobe/experiment-v8.spec.ts.
  stepTracker.setStep('Download');
  const filePath = await editor.downloadDesign(testInfo.workerIndex);
  console.log(`File saved to: ${filePath}`);
  expect(filePath).toBeTruthy();

});

import { defineAdobeAccountTests } from '../../src/adobe/spec';
import { AdobePage } from "../../src/pages/adobe";
import { GmailProvider } from "../../src/pages/gmailProvider";
import { MsProvider} from "../../src/pages/msProvider";

// Login-only flow: sign in, land on the dashboard and dismiss Let's Go — no postcard,
// link or download. A pass means the account can log in and is activated.
defineAdobeAccountTests('script flow', async ({ page, account, stepTracker }) => {
    const adobe = new AdobePage(page);
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

  // Throws if the dashboard never loads, so reaching the next step means login succeeded.
  stepTracker.setStep('Wait for Adobe Dashboard');
  await adobe.waitForDashboard();

  stepTracker.setStep('Activate by Lets Go');
  await adobe.skipLetsGoViaAPI(account.email);

});

import { expect, Locator, Page } from "@playwright/test";

export class EditorDashboard {
    readonly page: Page;
    readonly openInEditor: Locator;
    readonly skipTutorial_btn: Locator;
    readonly navSharebtn: Locator;
    readonly viewOnlyLink: Locator;
    readonly createLinkBtn: Locator;
    readonly copyLinkBtn: Locator;
    readonly publishUrl: Locator;

    constructor(page: Page) {
        this.page = page;
        this.openInEditor = page.getByRole('button', { name: 'Open in editor' });
        this.skipTutorial_btn = page.getByText('Skip tour');
        this.navSharebtn = page.locator('#share-btn');
        this.viewOnlyLink = page.getByRole('menuitem', { name: 'View-only link' });
        this.createLinkBtn = page.locator('#ptwPublishBtn');
        this.copyLinkBtn = page.getByRole('button', { name: 'Copy link' });
        this.publishUrl = page.getByLabel('Published URL');
    }

    async clickOpenInEditor(): Promise<void> {
        await expect(this.openInEditor).toBeEnabled({ timeout: 20000 });
        await this.openInEditor.click({ timeout: 20000 });
    }

    async skipTutorial(): Promise<void> {
        // 1. Try to skip tutorial tour (if visible)
        try {
            const skipTourBtn = this.page.getByRole('button', { name: 'Skip tour' }).or(this.page.getByText('Skip tour'));
            if (await skipTourBtn.isVisible()) {
                await skipTourBtn.click({ timeout: 5000 });
            }
        } catch (e) {
            console.log('skipTutorial: error checking/clicking Skip tour', e);
        }

        // 2. Try to dismiss quick tips / popups (if visible)
        try {
            const gotItBtn = this.page.getByRole('button', { name: 'Got it' }).or(this.page.getByText('Got it'));
            if (await gotItBtn.isVisible()) {
                await gotItBtn.click({ timeout: 5000 });
            }
        } catch (e) {
            console.log('skipTutorial: error checking/clicking Got it', e);
        }
    }

    async clickShare(): Promise<void> {
        await expect(this.navSharebtn).toBeEnabled({ timeout: 20000 });
        await this.navSharebtn.click({ timeout: 20000 });
    }

    async openViewOnlyLink(): Promise<void> {
        await expect(this.viewOnlyLink).toBeEnabled({ timeout: 20000 });
        await this.viewOnlyLink.click({ timeout: 20000 });
        await this.page.getByText('A view-only link allows anyone to see the file').waitFor({ state: 'visible', timeout: 15000 });
    }

    async clickCreateLink(): Promise<void> {
        await expect(this.createLinkBtn).toBeEnabled({ timeout: 20000 });
        await this.createLinkBtn.click({ timeout: 20000 });
        await expect(this.copyLinkBtn).toBeVisible({ timeout: 30000 });
    }

    async clickCopyLink(): Promise<string> {
        await expect(this.copyLinkBtn).toBeEnabled({ timeout: 20000 });
        await this.copyLinkBtn.click({ timeout: 20000 });

        // Wait for the Published URL input to have a non-empty value (fixes race condition & pierces Shadow DOM)
        await expect(this.publishUrl).toHaveValue(/https:\/\/new\.express\.adobe\.com/, { timeout: 30000 });

        const link = await this.publishUrl.inputValue();
        console.log('Publish Link: ', link);
        return link.trim();
    }
}
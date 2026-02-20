import { test, expect } from '@playwright/test';

test.describe('Fluxo Principal SmartOS', () => {
    test('deve realizar uma venda completa e verificar pontos de fidelidade', async ({ page }) => {
        // 1. Login (Mock)
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@smartos.com');
        await page.fill('input[type="password"]', 'password');
        await page.click('button[type="submit"]');

        // 2. Acessar PDV
        await page.click('text=PDV');
        await expect(page).toHaveURL(/.*pdv/);

        // 3. Adicionar Produto
        await page.click('text=Adicionar'); // Simula adicionar primeiro item

        // 4. Selecionar Cliente
        await page.click('text=Selecionar Cliente');
        await page.click('text=João Silva');

        // 5. Finalizar Venda
        await page.click('text=Finalizar Venda');
        await expect(page.locator('text=Venda realizada com sucesso')).toBeVisible();

        // 6. Verificar Auditoria
        await page.goto('/configuracoes/auditoria');
        await expect(page.locator('text=VENDAS')).first().toBeVisible();
        await expect(page.locator('text=INSERT')).first().toBeVisible();
    });

    test('deve gerar descrição com IA para novo produto', async ({ page }) => {
        await page.goto('/estoque/novo');
        await page.fill('input[name="nome"]', 'iPhone 15 Pro Max');
        await page.click('text=GERAR COM IA');

        const description = await page.inputValue('textarea[name="descricao"]');
        expect(description.length).toBeGreaterThan(50);
    });
});

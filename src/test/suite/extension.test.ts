import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('den'));
    });

    test('Should activate', async () => {
        const ext = vscode.extensions.getExtension('den');
        if (ext) {
            await ext.activate();
            assert.ok(true);
        }
    });
});

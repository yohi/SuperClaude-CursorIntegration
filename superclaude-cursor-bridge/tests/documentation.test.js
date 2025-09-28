/**
 * ドキュメント存在テスト
 * TDD Red Phase: 必要なドキュメントが存在することを検証
 */

import fs from 'fs';
import path from 'path';

const docsDir = path.join(process.cwd(), 'docs');

describe('Documentation Requirements', () => {
  describe('Installation Guide', () => {
    test('should have installation.md file', () => {
      const filePath = path.join(docsDir, 'installation.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('installation.md should contain basic installation steps', () => {
      const filePath = path.join(docsDir, 'installation.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/# インストールガイド/);
      expect(content).toMatch(/SuperClaude CLI.*インストール/);
      expect(content).toMatch(/Bridge.*セットアップ/);
      expect(content).toMatch(/設定.*初期化/);
    });
  });

  describe('User Manual', () => {
    test('should have user-manual.md file', () => {
      const filePath = path.join(docsDir, 'user-manual.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('user-manual.md should contain usage examples', () => {
      const filePath = path.join(docsDir, 'user-manual.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/# ユーザーマニュアル/);
      expect(content).toMatch(/基本的な使用方法/);
      expect(content).toMatch(/コマンド.*実行/);
    });
  });

  describe('Configuration Guide', () => {
    test('should have configuration.md file', () => {
      const filePath = path.join(docsDir, 'configuration.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('configuration.md should contain settings reference', () => {
      const filePath = path.join(docsDir, 'configuration.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/# 設定ガイド/);
      expect(content).toMatch(/\.claude\.json/);
      expect(content).toMatch(/settings\.json/);
    });
  });

  describe('Troubleshooting Guide', () => {
    test('should have troubleshooting.md file', () => {
      const filePath = path.join(docsDir, 'troubleshooting.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('troubleshooting.md should contain common issues', () => {
      const filePath = path.join(docsDir, 'troubleshooting.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/# トラブルシューティング/);
      expect(content).toMatch(/よくある問題/);
      expect(content).toMatch(/解決方法/);
    });
  });
});
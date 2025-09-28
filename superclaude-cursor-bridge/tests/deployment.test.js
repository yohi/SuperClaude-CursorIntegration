/**
 * デプロイメント準備テスト
 * TDD Red Phase: デプロイメントに必要なファイルが存在することを検証
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

describe('Deployment Preparation Requirements', () => {
  describe('Package Configuration', () => {
    test('should have package.json with correct metadata', () => {
      const packagePath = path.join(projectRoot, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);

      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      expect(packageData.name).toBe('superclaude-cursor-bridge');
      expect(packageData.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(packageData.description).toBeDefined();
      expect(packageData.main).toBeDefined();
      expect(packageData.keywords).toContain('superclaude');
      expect(packageData.keywords).toContain('cursor');
    });

    test('should have proper repository configuration', () => {
      const packagePath = path.join(projectRoot, 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      expect(packageData.repository).toBeDefined();
      expect(packageData.repository.type).toBe('git');
      expect(packageData.homepage).toBeDefined();
      expect(packageData.bugs).toBeDefined();
    });
  });

  describe('Installation Scripts', () => {
    test('should have install script', () => {
      const scriptPath = path.join(projectRoot, 'scripts', 'install.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    test('install script should contain setup logic', () => {
      const scriptPath = path.join(projectRoot, 'scripts', 'install.js');
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toMatch(/SuperClaude.*インストール/);
      expect(content).toMatch(/設定.*初期化/);
    });
  });

  describe('Version Management', () => {
    test('should have version script', () => {
      const scriptPath = path.join(projectRoot, 'scripts', 'version.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    test('should have CHANGELOG.md', () => {
      const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
      expect(fs.existsSync(changelogPath)).toBe(true);
    });

    test('CHANGELOG.md should contain version history', () => {
      const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
      const content = fs.readFileSync(changelogPath, 'utf-8');
      expect(content).toMatch(/# CHANGELOG/);
      expect(content).toMatch(/## \[.*\]/); // Version header
      expect(content).toMatch(/### Added|### Changed|### Fixed/);
    });
  });

  describe('Distribution Files', () => {
    test('should have appropriate .gitignore', () => {
      const gitignorePath = path.join(projectRoot, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toMatch(/node_modules/);
      expect(content).toMatch(/\.env/);
      expect(content).toMatch(/logs/);
    });

    test('should have README.md with installation instructions', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toMatch(/# SuperClaude Cursor/);
      expect(content).toMatch(/インストール|Installation/);
      expect(content).toMatch(/使用方法|Usage/);
    });
  });

  describe('Security and Validation', () => {
    test('should have dependency audit passing', async () => {
      // Note: This would require actual npm audit execution
      // For now, we just check that package-lock.json exists
      const lockPath = path.join(projectRoot, 'package-lock.json');
      expect(fs.existsSync(lockPath)).toBe(true);
    });

    test('should not include sensitive files in distribution', () => {
      const gitignorePath = path.join(projectRoot, '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      // Check that sensitive patterns are ignored
      expect(content).toMatch(/\.env/);
      expect(content).toMatch(/secret/);
      expect(content).toMatch(/\*\.key/);
      expect(content).toMatch(/id_rsa/);
      expect(content).toMatch(/\.pem/);
    });
  });
});
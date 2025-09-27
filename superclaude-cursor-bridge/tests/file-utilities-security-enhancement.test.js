/**
 * File Utilities セキュリティ強化テスト
 * CodeRabbitの指摘に基づく修正の検証
 */

import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import { FileUtilities } from '../src/file-utilities.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('File Utilities - セキュリティ強化テスト', () => {
  let fileUtils;
  let testDir;

  beforeEach(async () => {
    // テスト用一時ディレクトリの作成
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fileutils-security-test-'));
    fileUtils = new FileUtilities(testDir);
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error.message);
    }
  });

  describe('改善されたパストラバーサル検出', () => {
    test('ファイル名に .. が含まれている正当なファイルを許可する', async () => {
      // ファイル名に .. が含まれているが、パストラバーサル攻撃ではないファイル
      const validFilenames = [
        'myfile..txt',           // ファイル名の中に ..
        'document..backup',      // 拡張子風の使用方法
        '..hidden',              // 隠しファイル（Unixスタイル）
        'test..config..json',    // 複数の .. を含む正当なファイル名
        'backup..2024..01..15'   // 日付区切りとしての ..
      ];

      for (const filename of validFilenames) {
        // ファイルを作成
        const content = `Test content for ${filename}`;
        await expect(fileUtils.writeFile(filename, content)).resolves.toBeUndefined();

        // ファイルを読み取り
        const readContent = await fileUtils.readFile(filename);
        expect(readContent).toBe(content);

        // ファイルの存在確認
        const exists = await fileUtils.fileExists(filename);
        expect(exists).toBe(true);
      }
    });

    test('実際のパストラバーサル攻撃を確実に防ぐ', async () => {
      // パストラバーサル攻撃のパターン
      const maliciousPatterns = [
        '../etc/passwd',         // 典型的なパストラバーサル
        '../../secret.txt',      // 複数レベルの遡及
        'safe/../../../etc/hosts', // 偽装された安全パス
        './../../config/app.conf', // 現在ディレクトリからの遡及
        '../../../root/.ssh/id_rsa', // SSH鍵への攻撃
        './../system32/config',  // Windows系への攻撃
      ];

      for (const maliciousPath of maliciousPatterns) {
        await expect(fileUtils.readFile(maliciousPath)).rejects.toThrow(
          'Security violation: path traversal detected'
        );

        await expect(fileUtils.writeFile(maliciousPath, 'malicious')).rejects.toThrow(
          'Security violation: path traversal detected'
        );

        await expect(fileUtils.fileExists(maliciousPath)).rejects.toThrow(
          'Security violation: path traversal detected'
        );
      }
    });

    test('混合パターンを適切に処理する', async () => {
      // 複雑なケースの組み合わせ
      const testCases = [
        // 許可されるべきケース
        { path: 'subdir/file..with..dots', shouldAllow: true },
        { path: 'config..backup/settings.json', shouldAllow: true },
        { path: 'logs/app..2024..log', shouldAllow: true },

        // 拒否されるべきケース
        { path: 'subdir/../config.txt', shouldAllow: false },
        { path: 'valid/../../secret', shouldAllow: false },
        { path: './safe/../../../danger', shouldAllow: false }
      ];

      for (const testCase of testCases) {
        if (testCase.shouldAllow) {
          // 許可されるパスの場合、ディレクトリを作成してからテスト
          const dirPath = path.dirname(testCase.path);
          if (dirPath !== '.') {
            await fileUtils.createDirectory(dirPath);
          }

          await expect(fileUtils.writeFile(testCase.path, 'test')).resolves.toBeUndefined();
        } else {
          // 拒否されるパスの場合
          await expect(fileUtils.writeFile(testCase.path, 'test')).rejects.toThrow(
            'Security violation: path traversal detected'
          );
        }
      }
    });

    test('正規化プロセスでのセキュリティ保持', async () => {
      // 正規化される前後でのセキュリティチェック
      const pathVariations = [
        // Windows式のパス区切り文字
        { path: 'subdir\\..\\secret.txt', shouldReject: true },
        { path: 'subdir\\file..backup.txt', shouldReject: false },

        // 冗長なセパレータ
        { path: 'normal//file..txt', shouldReject: false },
        { path: 'normal//..//secret', shouldReject: true },

        // 現在ディレクトリ参照
        { path: './file..config', shouldReject: false },
        { path: './../secret', shouldReject: true }
      ];

      for (const variation of pathVariations) {
        if (variation.shouldReject) {
          await expect(fileUtils.writeFile(variation.path, 'test')).rejects.toThrow();
        } else {
          // 必要に応じてディレクトリを作成
          const dirPath = path.dirname(variation.path);
          if (dirPath !== '.' && dirPath !== '') {
            await fileUtils.createDirectory(dirPath);
          }
          await expect(fileUtils.writeFile(variation.path, 'test')).resolves.toBeUndefined();
        }
      }
    });
  });

  describe('パフォーマンスへの影響確認', () => {
    test('セキュリティチェックが性能に大きな影響を与えない', async () => {
      const iterations = 100;
      const testPaths = [
        'simple.txt',
        'file..with..dots.txt',
        'subdir/nested..file.txt',
        'complex..name..structure..test.json'
      ];

      // テストディレクトリとファイルを準備
      await fileUtils.createDirectory('subdir');

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        for (const testPath of testPaths) {
          await fileUtils.writeFile(`${i}_${testPath}`, `content ${i}`);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1ファイルあたり平均100ms以下であることを確認（非常に寛容な基準）
      const averageTimePerFile = duration / (iterations * testPaths.length);
      expect(averageTimePerFile).toBeLessThan(100);

      console.log(`Average time per file operation: ${averageTimePerFile.toFixed(2)}ms`);
    });
  });
});
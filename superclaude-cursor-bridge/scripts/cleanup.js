#!/usr/bin/env node

/**
 * 自動クリーンアップスクリプト
 * テスト実行後やCI/CDで不要ファイルを削除する
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 削除対象のパターン（gitignoreと重複しないファイルのみ）
const CLEANUP_PATTERNS = [
  // 明確に一時的なファイル
  '*.tmp',
  '*.temp',
  '*.swp',
  '*.swo',
  '*~',
  '.DS_Store',
  'Thumbs.db',

  // コマンド実行で作成される一時ファイル
  'coverage/',
  'test-results/',
  '.nyc_output/',

  // ログファイル（重要でないもの）
  'debug.log',
  'error.log'
];

// 保護するディレクトリ（削除しない）
const PROTECTED_DIRS = [
  'node_modules',
  '.git',
  'src',
  'tests',
  'scripts',
  '.claude'
];

/**
 * glob風パターンマッチング（簡易版）
 */
function matchPattern(filename, pattern) {
  const dirPattern = pattern.endsWith('/');
  const normalized = pattern.replace(/\/$/, '');

  // 特殊文字をエスケープ（* と ? は後段でワイルドカード化）
  const esc = (s) => s.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  let safe = esc(normalized)
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  // ディレクトリ指定は配下全体も対象にする
  if (dirPattern) {
    safe = `${safe}(?:\\/.*)?`;
  }

  try {
    return new RegExp(`^${safe}$`).test(filename);
  } catch (error) {
    // 正規表現が無効な場合は安全側に倒してfalseを返す
    console.warn(`Invalid pattern: ${pattern}`, error.message);
    return false;
  }
}

/**
 * ディレクトリを再帰的にスキャンして削除候補を探す
 */
async function findFilesToDelete(dir, relativePath = '') {
  const filesToDelete = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFullPath = path.join(relativePath, entry.name);

      // 保護されたディレクトリはスキップ
      if (entry.isDirectory() && PROTECTED_DIRS.includes(entry.name)) {
        continue;
      }

      // パターンマッチをチェック
      const shouldDelete = CLEANUP_PATTERNS.some(pattern => {
        const nameMatch = matchPattern(entry.name, pattern);
        const pathMatch = matchPattern(relativeFullPath, pattern);

        // デバッグ出力（開発時のみ）
        if (process.env.DEBUG_CLEANUP) {
          console.log(`Checking ${entry.name} against ${pattern}: name=${nameMatch}, path=${pathMatch}`);
        }

        return nameMatch || pathMatch;
      });

      if (shouldDelete) {
        filesToDelete.push({
          path: fullPath,
          relativePath: relativeFullPath,
          isDirectory: entry.isDirectory(),
          size: entry.isFile() ? (await fs.stat(fullPath)).size : 0
        });
      } else if (entry.isDirectory()) {
        // 保護されていないディレクトリは再帰的にスキャン
        const subFiles = await findFilesToDelete(fullPath, relativeFullPath);
        filesToDelete.push(...subFiles);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
  }

  return filesToDelete;
}

/**
 * ファイル/ディレクトリを削除
 */
async function deleteItem(item) {
  try {
    if (item.isDirectory) {
      await fs.rm(item.path, { recursive: true, force: true });
      console.log(`🗂️  Deleted directory: ${item.relativePath}`);
    } else {
      await fs.unlink(item.path);
      const sizeStr = item.size > 1024
        ? `${(item.size / 1024).toFixed(1)}KB`
        : `${item.size}B`;
      console.log(`📄 Deleted file: ${item.relativePath} (${sizeStr})`);
    }
  } catch (error) {
    console.error(`❌ Failed to delete ${item.relativePath}: ${error.message}`);
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🧹 Starting cleanup process...');
  console.log(`📁 Project root: ${projectRoot}`);

  const filesToDelete = await findFilesToDelete(projectRoot);

  if (filesToDelete.length === 0) {
    console.log('✨ No files to clean up!');
    return;
  }

  console.log(`\n📋 Found ${filesToDelete.length} items to delete:`);
  filesToDelete.forEach(item => {
    const icon = item.isDirectory ? '🗂️ ' : '📄';
    console.log(`   ${icon} ${item.relativePath}`);
  });

  // 削除確認（CI環境では自動実行）
  const isCI = process.env.CI || process.argv.includes('--yes') || process.argv.includes('-y');

  if (!isCI) {
    if (!process.stdin.isTTY) {
      console.log('\nℹ️ Non-TTY detected. Re-run with --yes to auto-confirm.');
      return;
    }
    console.log('\n❓ Delete these files? (y/N)');
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const answer = await new Promise(resolve => {
      process.stdin.once('data', data => {
        const input = data.toString().trim().toLowerCase();
        resolve(input === 'y' || input === 'yes');
      });
    });

    process.stdin.setRawMode(false);
    process.stdin.pause();

    if (!answer) {
      console.log('❌ Cleanup cancelled');
      return;
    }
  }

  console.log('\n🗑️  Deleting files...');

  let deletedCount = 0;
  let totalSize = 0;

  for (const item of filesToDelete) {
    await deleteItem(item);
    deletedCount++;
    totalSize += item.size;
  }

  const totalSizeStr = totalSize > 1024 * 1024
    ? `${(totalSize / 1024 / 1024).toFixed(1)}MB`
    : totalSize > 1024
      ? `${(totalSize / 1024).toFixed(1)}KB`
      : `${totalSize}B`;

  console.log(`\n✅ Cleanup completed!`);
  console.log(`   📊 Deleted ${deletedCount} items`);
  console.log(`   💾 Freed ${totalSizeStr} of disk space`);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  });
}

export { findFilesToDelete, deleteItem };
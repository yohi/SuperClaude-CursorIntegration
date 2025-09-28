#!/usr/bin/env node

/**
 * SuperClaude Cursor Bridge バージョン管理スクリプト
 * セマンティックバージョニングに基づくバージョン管理を提供
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * package.jsonからバージョン情報を取得
 * @returns {Object} パッケージ情報
 */
function getPackageInfo() {
  const packagePath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json not found');
  }

  return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
}

/**
 * CHANGELOGにエントリを追加
 * @param {string} version - 新しいバージョン
 * @param {Array} changes - 変更内容
 */
function updateChangelog(version, changes = []) {
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];

  let changelog = '';
  if (fs.existsSync(changelogPath)) {
    changelog = fs.readFileSync(changelogPath, 'utf-8');
  } else {
    changelog = '# CHANGELOG\n\n';
  }

  const newEntry = `## [${version}] - ${date}\n\n`;
  const changesList = changes.length > 0
    ? changes.map(change => `- ${change}`).join('\n') + '\n\n'
    : '### Added\n- 新機能の追加\n\n### Changed\n- 既存機能の変更\n\n### Fixed\n- バグ修正\n\n';

  // 最初のヘッダーの後に新しいエントリを挿入
  const lines = changelog.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('##')) || 2;

  lines.splice(insertIndex, 0, newEntry + changesList);

  fs.writeFileSync(changelogPath, lines.join('\n'));
  console.log(`✅ CHANGELOG.md を更新しました (v${version})`);
}

/**
 * package.jsonのバージョンを更新
 * @param {string} newVersion - 新しいバージョン
 */
function updatePackageVersion(newVersion) {
  const packagePath = path.join(projectRoot, 'package.json');
  const packageData = getPackageInfo();

  packageData.version = newVersion;

  fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  console.log(`✅ package.json のバージョンを ${newVersion} に更新しました`);
}

/**
 * バージョンを自動インクリメント
 * @param {string} currentVersion - 現在のバージョン
 * @param {string} type - インクリメントタイプ (patch, minor, major)
 * @returns {string} 新しいバージョン
 */
function incrementVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error('Invalid increment type. Use: major, minor, or patch');
  }
}

/**
 * 使用方法を表示
 */
function showUsage() {
  console.log(`
使用方法:
  node scripts/version.js <command> [options]

コマンド:
  show                現在のバージョンを表示
  patch               パッチバージョンをインクリメント (0.0.X)
  minor               マイナーバージョンをインクリメント (0.X.0)
  major               メジャーバージョンをインクリメント (X.0.0)
  set <version>       指定したバージョンに設定

例:
  node scripts/version.js show
  node scripts/version.js patch
  node scripts/version.js minor
  node scripts/version.js major
  node scripts/version.js set 1.2.3
`);
}

/**
 * メイン実行関数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    return;
  }

  const command = args[0];

  try {
    const packageInfo = getPackageInfo();
    const currentVersion = packageInfo.version;

    switch (command) {
      case 'show':
        console.log(`現在のバージョン: ${currentVersion}`);
        break;

      case 'patch':
      case 'minor':
      case 'major': {
        const newVersion = incrementVersion(currentVersion, command);
        console.log(`バージョンを ${currentVersion} から ${newVersion} に更新します`);

        updatePackageVersion(newVersion);
        updateChangelog(newVersion);

        console.log('\n🎉 バージョン更新が完了しました！');
        console.log('次のステップ:');
        console.log('1. CHANGELOG.mdの内容を確認・編集');
        console.log('2. git add . && git commit -m "chore: bump version to v' + newVersion + '"');
        console.log('3. git tag v' + newVersion);
        break;
      }

      case 'set': {
        const newVersion = args[1];
        if (!newVersion) {
          console.error('エラー: バージョンを指定してください');
          console.log('例: node scripts/version.js set 1.2.3');
          process.exit(1);
        }

        if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
          console.error('エラー: バージョン形式が正しくありません (例: 1.2.3)');
          process.exit(1);
        }

        console.log(`バージョンを ${currentVersion} から ${newVersion} に設定します`);

        updatePackageVersion(newVersion);
        updateChangelog(newVersion);

        console.log('\n🎉 バージョン設定が完了しました！');
        break;
      }

      default:
        console.error(`エラー: 不明なコマンド "${command}"`);
        showUsage();
        process.exit(1);
    }

  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { incrementVersion, updateChangelog, updatePackageVersion };
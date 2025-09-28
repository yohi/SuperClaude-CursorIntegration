#!/usr/bin/env node

/**
 * SuperClaude Cursor Bridge インストールスクリプト
 * SuperClaude CLIのインストールと設定の初期化を行います
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

console.log('🚀 SuperClaude Cursor Bridge セットアップを開始します...\n');

/**
 * コマンドを実行
 * @param {string} command - 実行するコマンド
 * @param {Array} args - コマンド引数
 * @param {Object} options - オプション
 * @returns {Promise<void>}
 */
function executeCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`> ${command} ${args.join(' ')}`);

    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * SuperClaude CLIの存在確認
 * @returns {Promise<boolean>}
 */
async function checkSuperClaudeInstallation() {
  try {
    await executeCommand('SuperClaude', ['--version']);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * SuperClaude CLIのインストール
 */
async function installSuperClaude() {
  console.log('📦 SuperClaude CLIのインストールを開始します...');

  try {
    // pipxでのインストールを試行
    console.log('pipxを使用してSuperClaudeをインストールします...');
    await executeCommand('pipx', ['install', 'SuperClaude']);
    console.log('✅ SuperClaude CLIがpipxでインストールされました');
  } catch (error) {
    console.log('⚠️  pipxでのインストールに失敗しました。npmを試行します...');

    try {
      await executeCommand('npm', ['install', '-g', '@bifrost_inc/superclaude']);
      console.log('✅ SuperClaude CLIがnpmでインストールされました');
    } catch (npmError) {
      console.error('❌ SuperClaude CLIのインストールに失敗しました:');
      console.error('   pipx:', error.message);
      console.error('   npm:', npmError.message);
      throw new Error('SuperClaude CLIのインストールに失敗しました');
    }
  }
}

/**
 * SuperClaudeの初期化
 */
async function initializeSuperClaude() {
  console.log('⚙️  SuperClaudeの初期化を開始します...');

  try {
    await executeCommand('SuperClaude', ['install']);
    console.log('✅ SuperClaudeの初期化が完了しました');
  } catch (error) {
    console.error('❌ SuperClaudeの初期化に失敗しました:', error.message);
    throw error;
  }
}

/**
 * 設定ファイルの初期化
 */
async function initializeConfiguration() {
  console.log('📝 設定の初期化を開始します...');

  const defaultSettingsPath = path.join(projectRoot, 'config', 'default-settings.json');
  const settingsPath = path.join(projectRoot, 'settings.json');

  // settings.jsonが存在しない場合、デフォルト設定をコピー
  if (!fs.existsSync(settingsPath) && fs.existsSync(defaultSettingsPath)) {
    try {
      const defaultSettings = fs.readFileSync(defaultSettingsPath, 'utf-8');
      fs.writeFileSync(settingsPath, defaultSettings);
      console.log('✅ デフォルト設定ファイルがコピーされました');
    } catch (error) {
      console.error('⚠️  設定ファイルのコピーに失敗しました:', error.message);
    }
  }

  // SuperClaude CLIパスの自動検出と設定
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      // Windows環境の判定とコマンドの選択
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'where' : 'which';
      const args = ['SuperClaude'];

      const childProcess = spawn(command, args, { shell: true });
      let stdout = '';

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout: stdout.trim() });
        } else {
          reject(new Error(`SuperClaude CLI path not found using ${command} command`));
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Failed to execute ${command} command: ${error.message}`));
      });
    });

    if (stdout && fs.existsSync(settingsPath)) {
      // 複数行の出力から最初の有効なパスを抽出
      const paths = stdout
        .replace(/\r\n/g, '\n') // CRLF を LF に正規化
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (paths.length > 0) {
        const cliPath = paths[0]; // 最初の有効なパスを使用

        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        settings.superclaude = settings.superclaude || {};
        settings.superclaude.cliPath = cliPath;

        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log(`✅ SuperClaude CLIパスが設定されました: ${cliPath}`);
      } else {
        console.log('⚠️  有効なSuperClaude CLIパスが見つかりませんでした');
      }
    }
  } catch (error) {
    console.log('⚠️  SuperClaude CLIパスの自動検出に失敗しました:', error.message);
  }

  console.log('✅ 設定の初期化が完了しました');
}

/**
 * インストール後の確認
 */
async function verifyInstallation() {
  console.log('🔍 インストールの確認を開始します...');

  try {
    // SuperClaude CLIの動作確認
    await executeCommand('SuperClaude', ['--version']);
    console.log('✅ SuperClaude CLIが正常に動作しています');

    // Bridge の依存関係確認
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      console.log('✅ package.jsonが存在します');
    }

    // 設定ファイル確認
    const settingsPath = path.join(projectRoot, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      console.log('✅ settings.jsonが存在します');
    }

    console.log('✅ インストール確認が完了しました');
  } catch (error) {
    console.error('❌ インストール確認でエラーが発生しました:', error.message);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    // SuperClaude CLIの確認とインストール
    const isInstalled = await checkSuperClaudeInstallation();

    if (!isInstalled) {
      await installSuperClaude();
      await initializeSuperClaude();
    } else {
      console.log('✅ SuperClaude CLIは既にインストールされています');
    }

    // 設定の初期化
    await initializeConfiguration();

    // インストール確認
    await verifyInstallation();

    console.log('\n🎉 SuperClaude Cursor Bridge のセットアップが完了しました！');
    console.log('\n次のステップ:');
    console.log('1. npm test でテストを実行');
    console.log('2. docs/user-manual.md でコマンドの使用方法を確認');
    console.log('3. Cursor IDEでSuperClaudeコマンドを実行');

  } catch (error) {
    console.error('\n❌ セットアップ中にエラーが発生しました:', error.message);
    console.error('\nトラブルシューティング:');
    console.error('- docs/troubleshooting.md を確認してください');
    console.error('- 手動でSuperClaude CLIをインストールしてみてください');
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  main();
}

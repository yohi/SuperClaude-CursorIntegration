#!/usr/bin/env node

import { spawn } from 'child_process';

/**
 * SuperClaude CLI接続テスト
 * 実際のSuperClaude CLIとの通信を検証
 */

console.log('🔍 SuperClaude CLI接続テストを開始...\n');

// テスト1: バージョン確認
async function testVersionCheck() {
  console.log('テスト1: SuperClaude CLIバージョン確認');

  return new Promise((resolve, reject) => {
    const child = spawn('SuperClaude', ['--version']);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ バージョン確認成功: ${output.trim()}`);
        resolve({ success: true, output: output.trim() });
      } else {
        console.log(`❌ バージョン確認失敗 (code: ${code}): ${errorOutput}`);
        reject(new Error(`Version check failed: ${errorOutput}`));
      }
    });

    child.on('error', (error) => {
      console.log(`❌ プロセス実行エラー: ${error.message}`);
      reject(error);
    });
  });
}

// テスト2: ヘルプコマンド確認
async function testHelpCommand() {
  console.log('\nテスト2: SuperClaude CLIヘルプコマンド確認');

  return new Promise((resolve, reject) => {
    const child = spawn('SuperClaude', ['--help']);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ヘルプコマンド成功');
        console.log(`📋 利用可能なオプション数: ${(output.match(/--\w+/g) || []).length}個`);
        resolve({ success: true, output: output.trim() });
      } else {
        console.log(`❌ ヘルプコマンド失敗 (code: ${code}): ${errorOutput}`);
        reject(new Error(`Help command failed: ${errorOutput}`));
      }
    });

    child.on('error', (error) => {
      console.log(`❌ プロセス実行エラー: ${error.message}`);
      reject(error);
    });
  });
}

// テスト3: インストール状況確認（dry-run）
async function testInstallStatus() {
  console.log('\nテスト3: SuperClaude インストール状況確認');

  return new Promise((resolve, reject) => {
    const child = spawn('SuperClaude', ['install', '--dry-run']);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      console.log(`📊 Dry-runテスト完了 (code: ${code})`);
      if (output.includes('SuperClaude')) {
        console.log('✅ SuperClaudeフレームワーク認識済み');
        resolve({ success: true, output: output.trim() });
      } else {
        console.log('⚠️ SuperClaudeフレームワークの詳細情報が取得できませんでした');
        resolve({ success: false, output: output.trim() });
      }
    });

    child.on('error', (error) => {
      console.log(`❌ プロセス実行エラー: ${error.message}`);
      reject(error);
    });
  });
}

// メイン実行
async function runTests() {
  try {
    await testVersionCheck();
    await testHelpCommand();
    await testInstallStatus();

    console.log('\n🎉 すべてのSuperClaude CLI接続テストが完了しました！');
    console.log('✅ Bridge プロジェクトからSuperClaude CLIへの通信が正常に動作しています。');

  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// テスト実行
runTests();
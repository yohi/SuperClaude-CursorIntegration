# トラブルシューティング

SuperClaude Cursor統合システムでよくある問題と解決方法を説明します。

## よくある問題

### 1. SuperClaude CLIが見つからない

**症状**: `SuperClaude command not found` エラーが発生

**原因**: SuperClaude CLIがインストールされていない、またはPATHに含まれていない

**解決方法**:
```bash
# pipxでのインストール確認
pipx list | grep SuperClaude

# パスの確認
which SuperClaude

# 再インストール
pipx install SuperClaude
```

### 2. コマンド実行がタイムアウトする

**症状**: 長時間実行後にタイムアウトエラー

**原因**: コマンドの実行時間が設定されたタイムアウトを超過

**解決方法**:
```javascript
// settings.jsonでタイムアウトを延長
{
  "superclaude": {
    "timeout": 60000  // 60秒に延長
  }
}
```

### 3. キャッシュが正常に動作しない

**症状**: 同じコマンドを実行してもキャッシュされない

**原因**: キャッシュ設定が無効、またはキャッシュ容量不足

**解決方法**:
```javascript
// settings.jsonでキャッシュ設定を確認
{
  "cache": {
    "enabled": true,
    "maxSize": 200,    // サイズを増加
    "ttl": 7200000     // 有効期限を延長
  }
}
```

### 4. JSON Protocol エラー

**症状**: `Failed to parse JSON response` エラー

**原因**: SuperClaude CLIからの応答形式が不正

**解決方法**:
```bash
# SuperClaudeの動作確認
SuperClaude --version

# ログファイルの確認
tail -f logs/bridge.log

# 設定ファイルの再作成
cp config/default-settings.json settings.json
```

### 5. 権限エラー

**症状**: `Permission denied` エラー

**原因**: ファイルやディレクトリへのアクセス権限不足

**解決方法**:
```bash
# 実行権限の付与
chmod +x scripts/*.js

# 設定ファイルの権限確認
ls -la *.json

# 必要に応じて権限変更
chmod 644 settings.json
```

## パフォーマンス問題

### 応答時間が遅い

**チェック項目**:
1. SuperClaude CLIのバージョンが最新か
2. キャッシュが有効になっているか
3. 不要なログ出力が無効になっているか

**最適化方法**:
```javascript
// パフォーマンス設定の調整
{
  "performance": {
    "monitoring": false,  // 本番環境ではfalse
    "logLevel": "error"   // エラーのみ出力
  }
}
```

## デバッグ方法

### ログ出力の有効化

```bash
# 環境変数でデバッグモードを有効化
export DEBUG_MODE=true
export LOG_LEVEL=debug

# アプリケーション実行
npm start
```

### 詳細ログの確認

```bash
# Bridge実行ログ
tail -f logs/bridge.log

# SuperClaude CLI実行ログ
tail -f logs/superclaude.log

# エラーログのみ表示
grep ERROR logs/*.log
```

## サポート情報

### バージョン確認

```bash
# Bridge バージョン
npm version

# SuperClaude CLI バージョン
SuperClaude --version

# Node.js バージョン
node --version
```

### 設定情報の収集

問題報告時には以下の情報を含めてください：

1. オペレーティングシステム
2. Node.jsバージョン
3. SuperClaude CLIバージョン
4. エラーメッセージの全文
5. 実行したコマンド
6. 設定ファイルの内容（機密情報を除く）

### 問題報告

問題が解決しない場合は、以下のチャンネルで報告してください：

- GitHub Issues: プロジェクトリポジトリのIssuesページ
- ドキュメント: 他のドキュメントで詳細な情報を確認
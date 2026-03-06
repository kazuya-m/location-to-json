# location-to-json

場所名・住所を検索し、緯度経度・住所分解・郵便番号などを好きな JSON 形式に整形してコピーできるツールです。

Google Geocoding API を使用します。依存ライブラリは不要で、`index.html` を開くだけで動作します。

---

## 使い方

### 1. リポジトリの取得

**自分用にカスタマイズしたい場合**

```bash
# GitHub でこのリポジトリを Fork してから
git clone https://github.com/<your-username>/location-to-json.git
cd location-to-json
```

**そのまま使う場合**

```bash
git clone https://github.com/kazuya-m/location-to-json.git
cd location-to-json
```

### 2. Google Geocoding API キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成（または既存のものを選択）
3. 「APIとサービス」→「ライブラリ」から **Geocoding API** を有効化
4. 「APIとサービス」→「認証情報」→「APIキーを作成」

> ⚠️ **APIキーの取り扱いに注意してください**
> - キーはブラウザの `localStorage` に保存されます。他のユーザーと共有する端末では使用しないでください
> - 検索時にリクエスト URL にキーが含まれるため、ブラウザの Network タブから確認可能です
> - **HTTP リファラ制限**または **IP 制限**を設定することを強く推奨します
> - Geocoding API は月 200 ドル分の無料クレジットが付与されるため、個人利用であれば月 40,000 リクエストまで実質無料です。[割り当てとシステム上限](https://console.cloud.google.com/iam-admin/quotas)から使用量の上限（Quota）も設定できます

### 3. 起動

`index.html` をブラウザで開き、API キーを入力して保存するだけです。

---

## 機能

- 場所名・住所でキーワード検索
- 複数候補から選択
- 緯度経度・住所分解・郵便番号などを取得
- テンプレートで出力 JSON を自由にカスタマイズ
- 検索履歴（最大8件）

---

## テンプレート変数

テンプレート欄では以下の変数が使用できます。検索結果に応じてリアルタイムで反映されます。

### 位置情報

| 変数 | 内容 | 例 |
|---|---|---|
| `{{lat}}` | 緯度 | `35.6762` |
| `{{lng}}` | 経度 | `139.6503` |
| `{{postalCode}}` | 郵便番号 | `160-0022` |
| `{{place_id}}` | Google Place ID | `ChIJ51cu8IcbXWARiRtXIothAS4` |
| `{{location_type}}` | 精度種別 | `ROOFTOP` / `APPROXIMATE` など |

### 住所分解（ベストエフォート）

| 変数 | 内容 | 例 |
|---|---|---|
| `{{prefecture}}` | 都道府県 | `東京都` |
| `{{address1}}` | 市区町村 + 町名 | `新宿区新宿` |
| `{{address2}}` | 丁目・番地 | `3丁目` |
| `{{building}}` | 施設名 | `新宿駅` |

> ⚠️ 住所分解は Google API のレスポンス構造に依存するため、場所によっては空になる場合があります。

### その他

| 変数 | 内容 |
|---|---|
| `{{query}}` | 検索キーワード（入力値そのまま） |
| `{{formatted_address}}` | Google の住所全文 |

### テンプレート例

```json
{
  "geocode": {
    "lat": {{lat}},
    "lng": {{lng}}
  },
  "postalCode": "{{postalCode}}",
  "address": {
    "prefecture": "{{prefecture}}",
    "address1": "{{address1}}",
    "address2": "{{address2}}",
    "building": "{{building}}"
  }
}
```

---

## 技術スタック

- Vanilla HTML / CSS / JavaScript（依存ライブラリなし）
- [Google Geocoding API](https://developers.google.com/maps/documentation/geocoding)

---

## ライセンス

[MIT](LICENSE)

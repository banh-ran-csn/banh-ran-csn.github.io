# Vòng nhân bản bánh rán: tài liệu kỹ thuật

## Chạy và kiểm thử

```bash
cd ~/canh_cua_nhan_ban
npm start          # http://127.0.0.1:8792/ (chỉ máy này; chuyển tiếp cổng 8792 nếu xem từ máy khác)
npm test           # 7 bài kiểm thử phép tính và thứ tự bước
CHROME=$(ls ~/.cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell | tail -1) node tool/e2e.mjs
tool/art/build.sh  # dựng lại hình từ ~/doraemon_pixel_art (chỉ cần khi bộ hình gốc thay đổi)
```

## Tech stack

- **Trang tĩnh**: HTML + CSS + JavaScript ES module. Không có framework, không có bước build, không cần server riêng hay cơ sở dữ liệu.
- **Canvas 2D** vẽ cảnh, không làm mịn (`image-rendering: pixelated`). Chữ và nút là HTML đặt chồng lên canvas.
- **Phông** đặt sẵn trong `public/fonts/` (woff2, giấy phép OFL): Baloo 2 (chữ tiếng Việt), Press Start 2P (số).
- **Công cụ**:
  - Node 22: server chạy thử, kiểm thử, điều khiển Chrome headless qua CDP mà không cần thư viện;
  - Python 3.9 với Pillow và numpy: dựng hình.

## Kiến trúc

- **Một sân khấu 16:9** (`#stage`) co giãn như một slide. `--u` = 1% bề ngang, mọi kích thước tính theo `--u`, nên không bao giờ bị cuộn.
- **Hai lớp toạ độ:**
  - lưới logic 384×216 điểm, mọi vị trí trong `game.js` đều tính theo lưới này;
  - canvas thật 1152×648, tức mỗi điểm logic bằng 3 điểm canvas, để hình Doraemon (lưới mịn gấp 3) hiện đủ từng điểm.
- **Hàm `blit()`** đặt mọi hình vào đúng điểm canvas nguyên, nên các điểm ảnh luôn sắc nét.
- **Thứ tự vẽ mỗi khung** (khoảng 30 khung/giây):
  1. tiệm (vẽ sẵn một lần);
  2. kệ và bánh;
  3. nửa sau của vòng, cùng xoáy màu trong lòng vòng;
  4. bánh trong balo, balo, Doraemon, quai balo;
  5. nửa trước của vòng, nên Doraemon trông như chui qua vòng;
  6. tia sáng và bánh đang bay.
- **Hoạt cảnh đi qua một vòng** dài 2,6 giây, tính bằng mili giây (hằng `T`):
  - đi tới vòng (0–900);
  - qua vòng: lóe sáng, số bánh trong balo nhân q (900);
  - đi tiếp tới ô mới (900–1700);
  - bánh bay lên kệ (1000–2280);
  - nhảy mừng (2200–2600).
- **Nhãn HTML** (uₖ, công thức dưới kệ, ×q, số thứ tự vòng) đặt theo phần trăm toạ độ canvas, nên luôn khớp với hình.

## Các file

| File | Vai trò |
|---|---|
| `public/js/logic.js` | Phần thuần, không đụng tới trang và có kiểm thử: `cakes(u1,q,k)`, câu hỏi của giáo viên (`questionsFor`), công thức (`formulaFor`), danh sách bước `STEPS`, nhãn nút (`nextLabel`), ô nào đã hiện số hay công thức. |
| `public/js/game.js` | Vẽ, hoạt cảnh, nhãn, hộp thoại (`say` + `fitSay` tự thu nhỏ chữ), nút và phím, đổi tham số thì làm lại. Có `window.__game` cho kiểm thử. |
| `public/js/art.js` | Phần vẽ bằng mã: tường, ốp gỗ, sàn, kệ, balo; lớp sáng và lòng vòng của hình vòng (`silhouette`, `holeMask`). |
| `public/css/style.css` | Bảng màu (kem `#fff6e2`, gỗ `#7a4a26`, chữ `#4a2c12`, cam `#ffa62b`, vàng `#ffd84d`), khung, nút, hộp thoại. |
| `public/assets/` | Hình đã dựng: `doraemon.png` 108×145, `ring.png` 29×59, `cake.png` 14×12. |
| `tool/serve.mjs` | Server tĩnh, chỉ nghe trên 127.0.0.1:8792, không cache, chặn đường dẫn ra ngoài `public/`. |
| `tool/e2e.mjs`, `tool/cdp.mjs` | Chạy hết bài trong Chrome headless ở 1366×768 và 1920×1080, kèm ảnh chụp từng bước (`/tmp/ccnb_shots`). |
| `tool/import_art.py`, `tool/art/` | Dựng hình (mục dưới). |

## Dựng hình (`tool/art/build.sh`)

Bộ hình gốc nằm ở `~/doraemon_pixel_art/` và không bao giờ bị sửa.

1. **Doraemon:** `import_art.py` lấy đúng lưới điểm ảnh trong `pixel_art.html` (`const SPRITES`, 120×161). Sau đó `shrink.py` thu còn 90%; ô mới nào nằm đè lên nét viền thì giữ màu viền, nên không mất nét. Không lấy mẫu lại hình gốc theo lưới thô: hình gốc có viền bị làm mịn và không nằm trên một lưới đều, lấy mẫu lại sẽ mất mắt và viền.
2. **Vòng và bánh:** `regen.py` chạy chính `hoop.py` và `dorayaki.py` trong `nguon_python/`, chỉ đổi bốn chỗ:
   - nhân toạ độ theo hệ số FX, FY;
   - giữ nét viền đúng 1 điểm;
   - đổi cỡ khung theo hệ số;
   - lưu mỗi ô thành một điểm.
   Vòng dùng FX 0.8, FY 1.32. Bánh dùng hệ số 0.3, bỏ viền trong và chỉ giữ một viền ngoài, vì ở cỡ nhỏ viền giữa các lớp làm bánh đen kịt.
3. **Nếu đổi cỡ hình** thì sửa cả `ART` (w, h) trong `game.js`. Khi kích thước không khớp, trang báo lỗi trên console.

Ở máy này, chạy Python bằng `python3 -E`, vì Pillow và numpy nằm trong site-packages của người dùng. Lệnh `uvx --with pillow` không cài được.

## Kiểm thử

- **`npm test`** (`test/logic.test.mjs`) kiểm:
  - các trường hợp 1–7 của giáo viên;
  - câu hỏi giữ đúng ý;
  - không bước nào hiện kết quả trước;
  - thứ tự khái quát rồi kết thúc.
- **`tool/e2e.mjs`** chơi thật từ đầu đến cuối và kiểm:
  - các dãy số và nhãn "+X bánh nữa";
  - bấm trong lúc đang đi không làm nhảy bước;
  - chạm vào vòng cũng đi được;
  - đổi q thì làm lại từ ô 1;
  - q = 1 thì các vòng ghi ×1;
  - chữ hộp thoại vừa khung ở mọi bước;
  - công thức nằm chính giữa phần trắng;
  - không bị cuộn ở cả hai cỡ màn hình;
  - không có lỗi trên trang.

## Đưa lên mạng

Chỉ cần đặt nguyên thư mục `public/` lên một chỗ phục vụ trang tĩnh (GitHub Pages, Firebase Hosting, Netlify…). Không có bước build và không có cấu hình riêng. Trước khi công khai, cần kiểm tra:

- giấy phép của bộ hình Doraemon có cho đăng công khai trên mạng không, hay chỉ cho dùng trong lớp;
- hai phông chữ dùng giấy phép OFL, tức được phép đăng kèm (file giấy phép đã có trong `public/fonts/`).

## Còn để ngỏ

- Hình **cánh cửa** (`canhcua_pixel.png`) có trong bộ hình nhưng chưa dùng. Hiện game dùng vòng.
- 4 ảnh JPEG trong `another_ver/` có nền ô caro in thẳng vào ảnh. Muốn dùng thì cần xuất lại thành PNG nền trong suốt.
- Hình Doraemon nhìn thẳng, nên khi đi sang phải chỉ nhún, không có khung bước chân. Muốn có dáng đi thật thì cần thêm các khung hình đi bộ trong bộ hình.
- Mới thử trên Chrome. Nên thử thêm trên trình duyệt và máy chiếu thật của lớp trước buổi dạy.

# Vòng nhân bản bánh rán (bản demo)

Trò chơi pixel một màn chiếu duy nhất, để khám phá công thức số hạng tổng quát của cấp số nhân. Trong một tiệm bánh nhỏ, Doraemon đeo balo đựng bánh rán, đi từ ô 1 đến ô 5 (5 kệ bánh). Giữa hai ô có một vòng thần kỳ, và qua mỗi vòng số bánh nhân lên q lần. Số bánh của mỗi ô hiện trên kệ gỗ treo tường phía trên ô. Phong cách: màu kem và gỗ ấm, khung chữ bo tròn viền nâu, chữ trên màn hình ở mức tối thiểu. Sau ô 4 (ô 5 là tùy chọn), trò chơi khái quát lên ô n: n − 1 vòng, rồi uₙ = u₁·qⁿ⁻¹. Ý tưởng gốc là của giáo viên, ở `~/Prompt_Web_Doraemon_Canh_Cua_Nhan_Ban_Cap_So_Nhan.md`. Trong game, "phòng" đổi thành "ô" và "cánh cửa" đổi thành "vòng thần kỳ"; câu hỏi vẫn giữ nguyên ý. Các nút: Bắt đầu, Đi, Hiện công thức, Khái quát đến ô thứ n, Hiện gợi ý, Kết luận, Làm lại.


Tài liệu:
- [docs/01_tong_quan_san_pham.md](docs/01_tong_quan_san_pham.md): mục đích, luồng, các trường hợp kiểm tra, quyết định đã chốt;
- [docs/02_tai_lieu_ky_thuat.md](docs/02_tai_lieu_ky_thuat.md): cách chạy, tech stack, kiến trúc, dựng hình, kiểm thử, đưa lên mạng.

```bash
cd ~/canh_cua_nhan_ban
npm start                 # http://127.0.0.1:8792/ (chuyển tiếp cổng 8792 qua VS Code)
npm test                  # phép tính, từng bước, không lộ kết quả sớm
CHROME=~/.cache/ms-playwright/chromium_headless_shell-1246/chrome-headless-shell-linux64/chrome-headless-shell node tool/e2e.mjs
```

- **Hình (có bản quyền):** lấy từ bộ hình pixel trong `~/doraemon_pixel_art/`. Dựng lại bằng một lệnh: `tool/art/build.sh`.
  - **Doraemon** (`doraemon.png`, 108×145): lấy lưới điểm ảnh trong `pixel_art.html` rồi thu còn 90%. Mỗi điểm mới mà nằm đè lên nét viền thì giữ màu viền, nên không mất nét nào.
  - **Vòng** (`ring.png`, 29×59) và **bánh rán** (`cake.png`, 14×12): chạy lại chính hai script `hoop.py` và `dorayaki.py` trong `nguon_python/`, cho ra kích thước hợp với game. Việc này do `tool/art/regen.py` làm: co giãn toạ độ, giữ nét viền đúng 1 điểm ảnh. Riêng chiếc bánh nhỏ chỉ giữ một viền ngoài, để các lớp bánh không bị viền đen lấp mất.
  - **Cùng một cỡ điểm ảnh:** mọi thứ dùng chung 3 điểm ảnh màn hình cho mỗi điểm ảnh của hình. Doraemon vẽ ở lưới mịn gấp 3 lần nên mỗi ô lấy 1 điểm. Viền của kệ và balo dùng đúng màu viền của bộ hình (#06051a).
  - **Tỉ lệ:** Doraemon cao 48 (bản gốc thu còn 90% bằng `tool/art/shrink.py`, giữ nét viền), vòng cao 59 (đủ cho Doraemon chui qua), bánh rộng 14.
- **Không cần server hay database.** Chỉ có trang tĩnh `public/`; muốn đưa lên mạng thì đặt thư mục này lên bất kỳ chỗ nào phục vụ trang tĩnh.
- **Điều khiển:**
  - nút lớn màu vàng, hoặc phím →: sang bước tiếp theo, mỗi lần bấm một bước, không bao giờ tự chạy;
  - chạm vào vòng đang nhấp nháy: Doraemon đi qua vòng;
  - R: làm lại;
  - F hoặc nút biểu tượng toàn màn hình ở góc phải trên.
- **Chọn u₁ và q** ở thanh trên cùng. Đổi giữa chừng thì làm lại từ ô 1, không giữ lại kết quả hay công thức nào.
- **Phông chữ:** Baloo 2 cho chữ (có tiếng Việt) và Press Start 2P cho số. Cả hai dùng giấy phép OFL, file ở `public/fonts/`.
- **Trên màn hình chỉ có:** thẻ uₖ = số bánh trên mỗi kệ, công thức ngắn dưới kệ (sau bước "Hiện công thức"), nhãn ×q trên mỗi vòng, và hộp thoại với câu hỏi, đáp án hoặc một công thức lớn. Không có âm thanh.
- **Trên 12 bánh:** vẽ 12 bánh kèm nhãn "+X bánh nữa"; số tổng hiện trên thẻ.
- **Mã nguồn:**
  - `public/js/logic.js`: phép tính và thứ tự các bước, không đụng tới trang (có kiểm thử);
  - `public/js/art.js`: phần vẽ bằng mã (tường, sàn, kệ gỗ, balo đỏ có quai) và lớp sáng, lòng vòng cho hình vòng;
  - `tool/art/`: dựng hình từ bộ hình gốc (`build.sh`, `regen.py`, `shrink.py`), cùng `tool/import_art.py`;
  - `public/js/game.js`: hoạt cảnh, chữ và nút bấm.

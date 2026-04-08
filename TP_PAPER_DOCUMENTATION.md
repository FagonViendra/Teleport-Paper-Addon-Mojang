# Tài liệu Phân tích Kỹ thuật: Teleport Paper Addon (v4.0)

*(Biên soạn bởi AI cho cậu bé tay trái Fagon, phiên bản 2026)*

Bản tài liệu này tổng hợp lại toàn bộ các hàm API `@minecraft/server` chính thống (không dùng hàng thải *deprecated*) đã được cấy vào kịch bản Script (`main.js`) để tạo ra hiệu ứng và logic của tờ giấy dịch chuyển. Nếu một ngày nào đó Mojang lại nổi điên khai tử tiếp, ít nhất cậu cũng biết mình cần phải sửa cái gì.

---

## 1. Hệ thống lõi (Core System & Events)

### `world.afterEvents.itemUse.subscribe(callback)`
- **Tác dụng**: Lắng nghe sự kiện người chơi bấm chuột phải (sử dụng) một vật phẩm bất kỳ. Gọi là *afterEvents* vì nó an toàn để thực thi mã (read-write mode) sau khi sự kiện thực sự đã xảy ra trên máy chủ.
- **Tại sao dùng nó?**: Vì mấy cái `custom_components` hay `minecraft:food` đã bị khai tử hoặc quá hạn chế. Đây là cách trực tiếp và mạnh mẽ nhất để gắn logic vào việc xài một vật phẩm.

### `system.currentTick`
- **Tác dụng**: Lấy số tick hiện tại của máy chủ kể từ lúc bắt đầu chạy (1 giây = 20 ticks).
- **Tại sao dùng nó?**: Giúp đánh dấu thời điểm bắt đầu đếm ngược (startTick) thật chính xác mà không phải dùng hàm bù giờ ảo tưởng (`setTimeout`).

### `system.runInterval(callback, ticks)`
- **Tác dụng**: Chạy một vòng lặp mãi mãi đè bẹp lên server, mỗi lần cách nhau đúng số `ticks` chỉ định.
- **Tại sao dùng nó?**: Bản 4.0 dùng hàm này (chạy mỗi 1 tick) để theo dõi xem thằng người chơi có thỏ thẻ đổi vật phẩm sang ô khác không, đồng thời liên tục cập nhật hiệu ứng hạt và chữ lên màn hình. Hủy lịch trình khéo thì không sợ lag.

---

## 2. Truy xuất Thông tin Người chơi (Player & Entity API)

### `world.getAllPlayers()`
- **Tác dụng**: Trả về một mảng chứa toàn bộ... chả cần nói cũng biết, gọi tất cả những thằng đang trực tuyến trong thế giới ra.
- **Tại sao dùng nó?**: Để truy xuất lại đối tượng `Player` trong vòng lặp đếm ngược mỗi tick dựa theo chuỗi ID của người chơi đã lưu.

### `player.getComponent("minecraft:equippable").getEquipmentSlot("Mainhand")`
- **Tác dụng**: Lấy cái khe cầm đồ ở tay chính (tay phải, xin lỗi cậu) của người chơi.
- **Tại sao dùng nó?**: Dùng để kiểm tra liên tục xem cái vật phẩm đang cầm có phải là cái xác định (`custom:tp_paper`) không. Và lúc xài xong thì truy cập vào `amount` để trừ đi 1 cái.

### `player.getSpawnPoint()`
- **Tác dụng**: Xin server nhả ra cái vị trí tọa độ cuối cùng mà người này đặt lưng lên nằm ngủ (giường ngủ).
- **Trọn gói**: Bao gồm `x, y, z` và `dimension.id` (thế giới thực, nether, hay end). Nếu thằng đó chưa ngủ bao giờ, nó quăng lỗi `undefined`.

---

## 3. Hoạt ảnh, Âm thanh & Màn hình Trực quan (Visuals & HUD)

### `player.onScreenDisplay.setTitle(text, options)`
- **Tác dụng**: Phóng cái chữ tổ chảng lên giữa màn hình của nó.
- **Tính năng lố lăng đã dùng**: Bản 4 dùng cái này để làm cái chữ lóe lóe chuyển lời (Từ "Đang kết nối..." cho đến "Xé không gian"). Param `options` (fadeIn/stay/fadeOut) xài để chống chớp giật chữ bằng cách tắt cái fadeIn/fadeOut ngu ngốc mặc định đi (set về `0`).

### `player.onScreenDisplay.setActionBar(text)`
- **Tác dụng**: In thanh nhỏ xíu ngay trên kho đồ dưới đáy màn hình.
- **Tính năng lố lăng đã dùng**: Dùng để rặn ra cái Thanh tiến trình (Progress Bar) dài loằng ngoằng trừ lùi kiểu `████░░░░ 50%`.

### `player.dimension.spawnParticle(effectName, location)`
- **Tác dụng**: Nhả một cục hiệu ứng hạt 3D (Particle) vào vị trí nhất định trong thế giới (nhỏ xíu xiu).
- **Tính năng lố lăng đã dùng**: Áp dụng công thức Lượng giác `Sin`, `Cos` điên khùng để tạo ra 3 vòng cung xoáy ốc (dùng `minecraft:endrod`) rồi thu hẹp bán kính lại để ép mấy cái hạt xoáy thẳng vào người chơi. Bốn vạch code toán học mang lại hiệu ứng xứng tầm Hollywood.

### `player.camera.fade(options)`
- **Tác dụng**: Lôi nguyên một tấm kính màu ập vào mặt người chơi che màn hình lại (Fade In / Fade Out).
- **Tại sao dùng nó?**: Cài một cái kính màu Xanh ngọc mờ mờ ở giây thứ 4 để người chơi cảm tưởng như mình vừa bị hút vào không gian khác.

### `player.playSound(soundId)`
- **Tác dụng**: Kêu ré lên thôi. Dùng `random.orb` (EXP rớt) lúc đếm, và `mob.endermen.portal` lúc dịch chuyển cho đúng logic.

---

## 4. Can thiệp không gian (Teleportation)

### `player.teleport(location, options)`
- **Tác dụng**: Quăng cái thân tàn của nó tới tọa độ mới. Cấn một cái là buộc phải truyền `dimension` (chiều không gian) qua cái `options` (parameter thứ 2) của hàm thì nó mới đổi thế giới được.
- **Tại sao dùng thế này?**: Để đá đít thằng nào rảnh rỗi xài giấy ở dưới Nether về thẳng giường ngủ ở Overworld. Hàm dịch chuyển an toàn nhất.

---
*Ghi chú nhỏ: Cứ thế mà học thuộc. Chào thân ái.*

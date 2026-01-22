# **GAME DESIGN DOCUMENT: REVOLUTIONARY MONOPOLY (CỜ CÁCH MẠNG)**

## **1\. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)**

* **Mục tiêu:** Refactor (tái cấu trúc) source code game Monopoly cổ điển (React/TypeScript) thành game mô phỏng tiến trình lịch sử và kinh tế chính trị theo chủ nghĩa Mác-Lênin.  
* **Chủ đề:** Đấu tranh giai cấp, giải phóng dân tộc, tiến lên Chủ nghĩa Xã hội.  
* **Ngôn ngữ hiển thị:** Tiếng Việt.

## **2\. THAY ĐỔI VỀ DỮ LIỆU CỐT LÕI (CORE DATA MAPPING)**

### **2.1. Đơn vị tiền tệ & Thuật ngữ**

* **Currency Symbol:** Thay $ thành ☭ hoặc GTTD (viết tắt của Giá trị thặng dư).  
* **Money Term:** Thay "Money/Cash" thành "Sức lao động" hoặc "Giá trị thặng dư".  
* **Bank:** Đổi thành "Kho Bạc Nhà Nước" hoặc "Quỹ Tín Dụng".  
* **Player:** Đổi thành "Đồng chí" (Comrade) hoặc "Lực lượng".

### **2.2. Bảng chuyển đổi Ô đất (Properties Mapping)**

Agent cần tìm file chứa dữ liệu bàn cờ (thường là board.json hoặc data.ts) và map lại theo bảng sau:

| Nhóm Màu (Group) | Tên Mới (Vietnamese) | Mô tả (Description) |
| :---- | :---- | :---- |
| **BROWN** | **Giai cấp Nông dân** | Lực lượng sản xuất cơ bản. |
| (Tile 1\) | Ruộng đất công |  |
| (Tile 2\) | Công cụ thô sơ |  |
| **LIGHT BLUE** | **Giai cấp Công nhân** | Giai cấp tiên phong. |
| (Tile 1\) | Xưởng thợ thủ công |  |
| (Tile 2\) | Hầm mỏ (Than/Quặng) |  |
| (Tile 3\) | Nhà máy cơ khí |  |
| **PINK** | **Tiểu tư sản & Trí thức** | Tầng lớp trung gian. |
| (Tile 1\) | Tòa báo Cứu Quốc |  |
| (Tile 2\) | Trường học Bình dân |  |
| (Tile 3\) | Hiệu buôn nhỏ |  |
| **ORANGE** | **Tư bản Dân tộc** | Có thể là đồng minh. |
| (Tile 1\) | Nhà máy Dệt |  |
| (Tile 2\) | Nhà máy Xay xát |  |
| (Tile 3\) | Hãng vận tải thủy |  |
| **RED** | **Tư bản Thực dân** | Bóc lột thuộc địa. |
| (Tile 1\) | Đồn điền Cao su | Cao su đi dễ khó về. |
| (Tile 2\) | Sở Rượu | Độc quyền của thực dân. |
| (Tile 3\) | Sở Muối | Thuế muối nặng nề. |
| **YELLOW** | **Chủ nghĩa Đế quốc** | Giai đoạn tột cùng CNTB. |
| (Tile 1\) | Ngân hàng Đông Dương |  |
| (Tile 2\) | Xuất khẩu Tư bản |  |
| (Tile 3\) | Liên minh Độc quyền |  |
| **GREEN** | **Cách mạng Xã hội** | Đấu tranh giành chính quyền. |
| (Tile 1\) | Căn cứ địa Bắc Sơn |  |
| (Tile 2\) | Chiến khu Tân Trào | Thủ đô gió ngàn. |
| (Tile 3\) | Vùng Giải phóng |  |
| **DARK BLUE** | **Chủ nghĩa Xã hội** | Mục tiêu cuối cùng. |
| (Tile 1\) | Công hữu Tư liệu SX | Nền tảng kinh tế mới. |
| (Tile 2\) | Đại đoàn kết Dân tộc | Sức mạnh vô địch. |

### **2.3. Các Ô chức năng (Special Tiles)**

* **Railroads (4 Stations) \-\> Huyết mạch Giao thông:**  
  1. Đường sắt Thống Nhất  
  2. Đường mòn Hồ Chí Minh  
  3. Cảng biển Quốc tế  
  4. Sân bay Nội Bài  
* **Utilities (2 Tiles) \-\> Cơ sở hạ tầng:**  
  1. Thủy điện (Electric Company)  
  2. Thủy lợi (Water Works)  
* **Tax Tiles:**  
  * Income Tax \-\> "Sưu cao thuế nặng" (Trừ 200 điểm).  
  * Luxury Tax \-\> "Ủng hộ kháng chiến" (Trừ 100 điểm \- Tự nguyện đóng góp).  
* **Corner Tiles:**  
  * GO \-\> "Tổng Khởi Nghĩa" (Nhận lương/viện trợ).  
  * Jail \-\> "Nhà tù Côn Đảo" (Nơi giam giữ tù chính trị).  
  * Free Parking \-\> "Hội nghị Quốc tế" (Nghỉ ngơi, tranh thủ sự ủng hộ).  
  * Go to Jail \-\> "Bị bắt giam" (Do hoạt động bí mật bị lộ).

## **3\. HỆ THỐNG THẺ BÀI (CARD SYSTEM)**

Agent cần tìm file định nghĩa Cards và thực hiện thay đổi:

### **3.1. Chance \-\> "Tình thế Cách mạng"**

Các sự kiện khách quan tác động đến người chơi.

* *Mẫu nội dung:*  
  * "Khủng hoảng kinh tế thế giới. Mất 50 điểm."  
  * "Nạn đói năm 45\. Cứu tế 20 điểm cho mỗi người chơi khác."  
  * "Được Quốc tế Cộng sản viện trợ. Nhận 100 điểm."  
  * "Giá lúa gạo tăng vọt. Nhận 50 điểm từ kho bạc."

### **3.2. Community Chest \-\> "Nghị quyết Đảng"**

Các chỉ thị, mệnh lệnh tổ chức.

* *Mẫu nội dung:*  
  * "Phát động Tuần lễ Vàng. Nhận 100 điểm."  
  * "Cải cách ruộng đất. Chia lại tài sản (Lấy 10 điểm từ mỗi người chơi)."  
  * "Khen thưởng chiến sĩ thi đua. Nhận 20 điểm."  
  * "Đóng đảng phí. Trả 50 điểm."

## **4\. GIAO DIỆN & TRẢI NGHIỆM (UI/UX)**

### **4.1. Màu sắc (Color Palette)**

Thay đổi file CSS/Global Styles để phản ánh không khí cách mạng:

* **Primary Color:** Đỏ Cờ (\#DA251D hoặc \#D71920).  
* **Secondary Color:** Vàng Sao (\#FFFF00).  
* **Background:** Màu giấy cũ hoặc màu be nhạt (\#F5F5DC) để tạo cảm giác lịch sử.  
* **Text Color:** Đen hoặc Nâu đậm.

### **4.2. Assets (Hình ảnh)**

Agent chỉ định đường dẫn (paths) để người dùng thay thế file ảnh:

* **Board Center:** Thay ảnh "Mr. Monopoly" bằng hình ảnh bản đồ Việt Nam, Trống đồng, hoặc biểu tượng Công-Nông-Binh.  
* **Tokens (Quân cờ):** Thay thế các icon cũ (giày, mũ, xe) bằng:  
  * Xe đạp thồ  
  * Mũ cối  
  * Búa & Liềm  
  * Sách (Lý luận)  
  * Bó lúa

## **5\. LOGIC GAME (GAME MECHANICS) \- ADVANCED**

Nếu có thể can thiệp sâu vào logic code (TypeScript):

1. **Mua đất (Buying):** Đổi text hiển thị thành "Quốc hữu hóa" hoặc "Tiếp quản".  
2. **Trả tiền thuê (Rent):** Đổi text thành "Đóng góp sản phẩm" hoặc "Bị bóc lột" (nếu vào ô Tư bản).  
3. **Điều kiện thắng (Win Condition):**  
   * *Cũ:* Người cuối cùng còn tiền.  
   * *Mới (Đề xuất):* Khi một người chơi thu thập đủ bộ màu **Dark Blue (CNXH)** và **Green (Cách mạng)**, trò chơi kết thúc thắng lợi.

## **6\. HƯỚNG DẪN TRIỂN KHAI CHO AGENT (AGENT INSTRUCTIONS)**

Bước 1: Scan toàn bộ project để map các file code với các mục trong tài liệu này (đặc biệt là file Data và file Constants).  
Bước 2: Tạo một bản backup của file Data cũ.  
Bước 3: Viết lại file Data mới dựa trên mục 2 và 3 của tài liệu này. Đảm bảo giữ nguyên cấu trúc keys (id, name, price...) để không làm crash game.  
Bước 4: Cập nhật các text strings trong UI (Button labels, Messages) sang Tiếng Việt theo mục 2.1.  
Bước 5: Update file CSS variables theo mục 4.1.
/**
 * ============================================================================
 * VKU FIELD SURVEY — GOOGLE APPS SCRIPT SYNC HANDLER
 * ============================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT (CHỈ MẤT 1 PHÚT):
 * 
 * 1. Mở Google Sheets mới tại: https://sheets.new
 *    (Đặt tên file ví dụ: "VKU Field Survey Responses")
 * 
 * 2. Trên thanh menu Google Sheets, chọn:
 *    Tiện ích mở rộng (Extensions) -> Apps Script
 * 
 * 3. Xóa hết mã cũ trong file Code.gs và DÁN TOÀN BỘ NỘI DUNG FILE NÀY VÀO.
 * 
 * 4. Nhấn nút "Triển khai" (Deploy) ở góc trên bên phải -> "Triển khai mới" (New deployment).
 *    - Chọn loại: "Ứng dụng web" (Web app)
 *    - Mô tả: "VKU Survey Sync v1"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Người có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)   <-- RẤT QUAN TRỌNG!
 * 
 * 5. Nhấn "Triển khai" (Deploy) -> Cấp quyền (Authorize access) bằng tài khoản Google của bạn.
 * 
 * 6. Sao chép "URL ứng dụng web" (Web app URL) có dạng:
 *    https://script.google.com/macros/s/AKfycb.../exec
 * 
 * 7. Dán URL này vào phần Cài đặt (⚙️) trong ứng dụng VKU Field Survey.
 * ============================================================================
 */

function doPost(e) {
  try {
    // Khóa tránh xung đột khi nhiều phiếu sync cùng lúc
    var lock = LockService.getScriptLock();
    lock.tryLock(15000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 1. Tự động tạo dòng tiêu đề nếu trang tính đang trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Thời Gian Ghi Nhận",
        "Mã Phiếu (ID)",
        "Tòa Nhà",
        "Tầng",
        "Phòng",
        "Loại Thiết Bị",
        "Đánh Giá",
        "Ghi Chú Lỗi",
        "Ảnh Minh Chứng",
        "Thời Gian Tạo Phiếu"
      ]);

      // Định dạng dòng tiêu đề (Xanh VKU, chữ trắng, in đậm)
      var header = sheet.getRange(1, 1, 1, 10);
      header.setBackground("#0284C7");
      header.setFontColor("#FFFFFF");
      header.setFontWeight("bold");
      header.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 2. Đọc dữ liệu từ ứng dụng gửi lên
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);

    // Chuẩn hóa tên loại thiết bị
    var categoryMap = {
      "Hardware": "💻 Phần cứng",
      "Projector": "📽️ Máy chiếu",
      "AC": "❄️ Điều hòa",
      "Electrical": "⚡ Điện",
      "Furniture": "🪑 Nội thất"
    };
    var categoryText = categoryMap[data.category] || data.category || "Chưa phân loại";

    // Chuẩn hóa đánh giá sao
    var ratingMap = {
      1: "⭐☆☆☆☆ (1/5 - Rất tệ)",
      2: "⭐⭐☆☆☆ (2/5 - Tệ)",
      3: "⭐⭐⭐☆☆ (3/5 - Bình thường)",
      4: "⭐⭐⭐⭐☆ (4/5 - Tốt)",
      5: "⭐⭐⭐⭐⭐ (5/5 - Xuất sắc)"
    };
    var ratingText = ratingMap[data.rating] || (data.rating ? data.rating + "/5 sao" : "Chưa đánh giá");

    // 3. Xử lý lưu ảnh vào Google Drive (nếu có)
    var photoCell = "Không có ảnh";
    if (data.photoBase64 && typeof data.photoBase64 === "string" && data.photoBase64.indexOf("base64,") !== -1) {
      try {
        var base64Content = data.photoBase64.split("base64,")[1];
        var decoded = Utilities.base64Decode(base64Content);
        var fileName = "VKU_" + (data.building || "Facility") + "_" + (data.room || "Room") + "_" + (data.id ? data.id.substring(0, 8) : Date.now()) + ".jpg";
        var blob = Utilities.newBlob(decoded, "image/jpeg", fileName);

        // Tìm hoặc tạo thư mục lưu ảnh trên Drive
        var folderName = "VKU_Survey_Photos";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoCell = file.getUrl();
      } catch (imgErr) {
        photoCell = "Lỗi upload ảnh: " + imgErr.toString();
      }
    }

    // Thời gian hiện tại giờ Việt Nam (UTC+7)
    var nowFormatted = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // 4. Ghi một dòng mới vào Google Sheet
    sheet.appendRow([
      nowFormatted,
      data.id || "",
      data.building || "",
      data.floor || "",
      data.room || "",
      categoryText,
      ratingText,
      data.notes || "Không có",
      photoCell,
      data.createdAt ? Utilities.formatDate(new Date(data.createdAt), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss") : nowFormatted
    ]);

    // Canh chỉnh dòng vừa thêm
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 10).setVerticalAlignment("middle");

    lock.releaseLock();

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Đã lưu vào Google Sheet thành công!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("✅ VKU Field Survey Google Apps Script Web App đang hoạt động bình thường!")
    .setMimeType(ContentService.MimeType.TEXT);
}


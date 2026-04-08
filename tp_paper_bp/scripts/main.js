import { world, system } from "@minecraft/server";

const TpPaperComponent = {
    onUse(event) {
        const player = event.source;
        player.sendMessage("§e[Debug] Đã nhấn giữ - bắt đầu kích hoạt giấy dịch chuyển...");
    },
    onCompleteUse(event) {
        const player = event.source;
        player.sendMessage("§e[Debug] onCompleteUse kích hoạt! Hoàn tất giữ vật phẩm.");
        
        if (player.typeId !== "minecraft:player") return;

        const equipment = player.getComponent("minecraft:equippable");
        if (equipment) {
            const slot = equipment.getEquipmentSlot("Mainhand");
            if (slot && slot.typeId === "custom:tp_paper") {
                if (slot.amount > 1) {
                    const newItem = slot.getItem();
                    newItem.amount -= 1;
                    slot.setItem(newItem);
                } else {
                    slot.setItem(undefined);
                }
            } else {
                const offSlot = equipment.getEquipmentSlot("Offhand");
                if (offSlot && offSlot.typeId === "custom:tp_paper") {
                    if (offSlot.amount > 1) {
                        const newItem = offSlot.getItem();
                        newItem.amount -= 1;
                        offSlot.setItem(newItem);
                    } else {
                        offSlot.setItem(undefined);
                    }
                }
            }
            player.sendMessage("§e[Debug] Bước trừ vật phẩm hoàn thành.");
        }

        player.sendMessage("§e[Debug] Đang đọc thông tin giường ngủ...");
        let spawnPos;
        try {
            spawnPos = player.getSpawnPoint();
        } catch(e) {
            player.sendMessage("§c[Debug] Lỗi trong lúc lấy spawn point: " + e);
        }

        if (spawnPos) {
            try {
                player.sendMessage(`§a[Debug] Giường nằm ở: ${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}`);
                player.teleport(spawnPos, { dimension: spawnPos.dimension });
                player.sendMessage("§a[Hệ thống] Đã dịch chuyển bạn về điểm hồi sinh an toàn!");
            } catch (err) {
                 player.sendMessage(`§c[Debug] Ngoại lệ khi chạy lệnh teleport: ${err}`);
            }
        } else {
            player.sendMessage("§c[Hệ thống] Tọa độ giường trống (bằng không). Bạn chưa có điểm hồi sinh thiết lập từ giường!");
        }
    }
};

world.beforeEvents.worldInitialize.subscribe((initEvent) => {
    initEvent.itemComponentRegistry.registerCustomComponent("custom:tp_paper_use", TpPaperComponent);
    console.warn("[Debug] Đã đăng ký custom component: custom:tp_paper_use");
});

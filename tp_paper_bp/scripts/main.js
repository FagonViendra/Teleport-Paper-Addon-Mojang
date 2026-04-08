import { world, system } from "@minecraft/server";

console.warn("[TP Paper] ========================================");
console.warn("[TP Paper] Script nạp thành công! Phiên bản: 3.0");
console.warn("[TP Paper] ========================================");

// Lưu trạng thái đếm ngược của từng người chơi
const activeTimers = new Map();

// Lắng nghe sự kiện itemUse (chuột phải với bất kỳ vật phẩm nào)
world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;

    console.warn(`[TP Paper Debug] itemUse => Player: ${player.name}, Item: ${item?.typeId}`);

    if (item?.typeId !== "custom:tp_paper") return;

    // Nếu đang đếm rồi thì bỏ qua
    if (activeTimers.has(player.id)) {
        player.sendMessage("§e✦ Đang đếm ngược rồi, giữ yên đi!");
        return;
    }

    player.sendMessage("§b✦ Giấy Dịch Chuyển đang kích hoạt! Cầm giữ trong 5 giây...");
    player.sendMessage("§7  (Nếu đổi vật phẩm khác sẽ bị hủy)");

    // Bắt đầu đếm
    activeTimers.set(player.id, {
        startTick: system.currentTick,
        lastAnnounce: 0
    });
});

// Vòng lặp chính - kiểm tra mỗi tick
system.runInterval(() => {
    for (const [playerId, data] of activeTimers) {
        // Tìm người chơi
        let player;
        try {
            const allPlayers = world.getAllPlayers();
            player = allPlayers.find(p => p.id === playerId);
        } catch (e) {
            activeTimers.delete(playerId);
            continue;
        }

        if (!player) {
            activeTimers.delete(playerId);
            continue;
        }

        // Kiểm tra còn cầm giấy không
        let stillHolding = false;
        try {
            const equipment = player.getComponent("minecraft:equippable");
            if (equipment) {
                const mainhand = equipment.getEquipmentSlot("Mainhand");
                if (mainhand && mainhand.typeId === "custom:tp_paper") {
                    stillHolding = true;
                }
            }
        } catch (e) {
            console.warn(`[TP Paper Debug] Lỗi kiểm tra equip: ${e}`);
        }

        if (!stillHolding) {
            activeTimers.delete(playerId);
            player.sendMessage("§c✦ Đã hủy! Bạn không còn cầm Giấy Dịch Chuyển.");
            continue;
        }

        const elapsed = system.currentTick - data.startTick;
        const secondsElapsed = Math.floor(elapsed / 20);

        // Thông báo đếm ngược mỗi giây
        if (secondsElapsed > data.lastAnnounce && secondsElapsed < 5) {
            data.lastAnnounce = secondsElapsed;
            const remaining = 5 - secondsElapsed;
            player.sendMessage(`§e✦ Đếm ngược: §f${remaining} §egiây...`);
            player.playSound("note.pling");
        }

        // Đủ 5 giây (100 tick)
        if (elapsed >= 100) {
            activeTimers.delete(playerId);
            console.warn(`[TP Paper Debug] Đủ 5 giây cho ${player.name}!`);

            // Đọc spawn point
            let spawnPos;
            try {
                spawnPos = player.getSpawnPoint();
                console.warn(`[TP Paper Debug] SpawnPoint: ${JSON.stringify(spawnPos)}`);
            } catch (e) {
                player.sendMessage(`§c[Debug] Lỗi getSpawnPoint: ${e}`);
                continue;
            }

            if (spawnPos && spawnPos.x !== undefined) {
                try {
                    // Trừ 1 vật phẩm
                    const equipment = player.getComponent("minecraft:equippable");
                    if (equipment) {
                        const slot = equipment.getEquipmentSlot("Mainhand");
                        if (slot && slot.amount > 1) {
                            slot.amount -= 1;
                        } else if (slot) {
                            slot.setItem(undefined);
                        }
                    }

                    // Dịch chuyển
                    const dimId = spawnPos.dimension?.id ?? "overworld";
                    const dim = world.getDimension(dimId);
                    player.teleport(
                        { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
                        { dimension: dim }
                    );

                    player.playSound("mob.endermen.portal");
                    player.sendMessage("§a✦ Dịch chuyển thành công về giường ngủ!");
                    player.sendMessage(`§7  Tọa độ: ${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}`);
                } catch (err) {
                    player.sendMessage(`§c[Debug] Lỗi teleport: ${err}`);
                    console.warn(`[TP Paper Debug] Ngoại lệ teleport: ${err}`);
                }
            } else {
                player.sendMessage("§c✦ Bạn chưa ngủ trên giường nào cả!");
                player.sendMessage("§7  Hãy tìm một chiếc giường và ngủ trước đã.");
            }
        }
    }
}, 1);

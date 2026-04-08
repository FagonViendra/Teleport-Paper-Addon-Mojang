import { world, system } from "@minecraft/server";

console.warn("[TP Paper] ========================================");
console.warn("[TP Paper] Script v4.0 - Hiệu ứng nâng cao!");
console.warn("[TP Paper] ========================================");

const activeTimers = new Map();
const TOTAL_TICKS = 100; // 5 giây

world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;
    if (item?.typeId !== "custom:tp_paper") return;

    if (activeTimers.has(player.id)) {
        player.sendMessage("§e✦ Đang kích hoạt rồi, giữ yên!");
        return;
    }

    // Title khởi đầu
    player.onScreenDisplay.setTitle("§b§l✦ §r§fGiấy Dịch Chuyển §b§l✦", {
        fadeInDuration: 10,
        stayDuration: 30,
        fadeOutDuration: 5
    });

    activeTimers.set(player.id, {
        startTick: system.currentTick,
        lastSecond: -1
    });

    player.playSound("random.orb");
});

// Hàm tạo thanh tiến trình kiểu đẹp
function buildProgressBar(progress) {
    // progress: 0.0 → 1.0
    const total = 20;
    const filled = Math.round(progress * total);
    const empty = total - filled;

    let color;
    if (progress > 0.6) color = "§a"; // xanh lá
    else if (progress > 0.3) color = "§e"; // vàng
    else color = "§c"; // đỏ

    const filledStr = color + "█".repeat(filled);
    const emptyStr = "§8" + "░".repeat(empty);
    const percent = Math.round(progress * 100);

    return `${filledStr}${emptyStr} §f${percent}%`;
}

// Hàm tạo biểu tượng nhấp nháy cho title
function getTitleForSecond(remaining) {
    const effects = [
        "§e§l⚡ §r§fĐang kết nối... §e§l⚡",
        "§6§l✧ §r§eChuẩn bị đường truyền §6§l✧",
        "§c§l❖ §r§6Xé không gian §c§l❖",
        "§d§l✦ §r§cGần tới rồi... §d§l✦",
        "§a§l★ §r§aDịch chuyển! §a§l★"
    ];
    return effects[Math.min(5 - remaining, effects.length - 1)] || effects[0];
}

system.runInterval(() => {
    for (const [playerId, data] of activeTimers) {
        let player;
        try {
            player = world.getAllPlayers().find(p => p.id === playerId);
        } catch { activeTimers.delete(playerId); continue; }
        if (!player) { activeTimers.delete(playerId); continue; }

        // Kiểm tra còn cầm giấy
        let stillHolding = false;
        try {
            const eq = player.getComponent("minecraft:equippable");
            const mh = eq?.getEquipmentSlot("Mainhand");
            stillHolding = mh?.typeId === "custom:tp_paper";
        } catch {}

        if (!stillHolding) {
            activeTimers.delete(playerId);
            player.sendMessage("§c✦ Đã hủy dịch chuyển!");
            player.onScreenDisplay.setTitle("§c§l✘ Đã hủy", {
                fadeInDuration: 0, stayDuration: 15, fadeOutDuration: 10
            });
            try { player.playSound("note.bass"); } catch {}
            continue;
        }

        const elapsed = system.currentTick - data.startTick;
        const progress = 1.0 - (elapsed / TOTAL_TICKS); // 1.0 → 0.0
        const currentSecond = Math.floor(elapsed / 20);
        const remaining = 5 - currentSecond;

        // ═══ HIỆU ỨNG HẠT (PARTICLES) ═══
        try {
            const pos = player.location;
            const t = elapsed * 0.12;
            // Vòng xoáy kép thu nhỏ dần (hội tụ vào người chơi)
            const radius = 2.0 * progress + 0.3;
            const yOffset = 0.8 + Math.sin(t * 0.5) * 0.5;

            for (let i = 0; i < 3; i++) {
                const angle = t + (i * Math.PI * 2 / 3);
                const px = pos.x + Math.cos(angle) * radius;
                const pz = pos.z + Math.sin(angle) * radius;
                player.dimension.spawnParticle("minecraft:endrod",
                    { x: px, y: pos.y + yOffset, z: pz }
                );
            }

            // Thêm hạt portal khi gần cuối (từ giây thứ 3)
            if (elapsed > 60) {
                for (let i = 0; i < 2; i++) {
                    const angle2 = -t * 1.5 + (i * Math.PI);
                    const r2 = radius * 0.6;
                    player.dimension.spawnParticle("minecraft:portal_directional",
                        {
                            x: pos.x + Math.cos(angle2) * r2,
                            y: pos.y + 1.0 + Math.random() * 0.8,
                            z: pos.z + Math.sin(angle2) * r2
                        }
                    );
                }
            }
        } catch {}

        // ═══ CẬP NHẬT TITLE + ACTION BAR MỖI GIÂY ═══
        if (currentSecond !== data.lastSecond && remaining > 0) {
            data.lastSecond = currentSecond;

            const titleText = getTitleForSecond(remaining);
            player.onScreenDisplay.setTitle(titleText, {
                fadeInDuration: 3,
                stayDuration: 17,
                fadeOutDuration: 0
            });

            player.playSound("note.pling");
        }

        // Action bar cùng thanh tiến trình mỗi 2 tick để mượt
        if (elapsed % 2 === 0) {
            try {
                const bar = buildProgressBar(progress);
                player.onScreenDisplay.setActionBar(
                    `§b✦ ${bar} §b✦`
                );
            } catch {}
        }

        // ═══ CAMERA FADE - bắt đầu từ giây 4 ═══
        if (elapsed === 80) {
            try {
                player.camera.fade({
                    fadeColor: { red: 0.2, green: 0.8, blue: 0.6 },
                    fadeTime: {
                        fadeInTime: 0.8,
                        holdTime: 0.4,
                        fadeOutTime: 0.8
                    }
                });
            } catch (e) {
                console.warn(`[TP Paper] Camera fade lỗi: ${e}`);
            }
        }

        // ═══ ĐỦ 5 GIÂY - DỊCH CHUYỂN ═══
        if (elapsed >= TOTAL_TICKS) {
            activeTimers.delete(playerId);

            // Title biến mất dần
            player.onScreenDisplay.setTitle("§a§l★ §r§aDịch chuyển thành công! §a§l★", {
                fadeInDuration: 0,
                stayDuration: 30,
                fadeOutDuration: 20
            });

            let spawnPos;
            try { spawnPos = player.getSpawnPoint(); } catch {}

            if (spawnPos && spawnPos.x !== undefined) {
                try {
                    // Trừ 1 vật phẩm
                    const eq = player.getComponent("minecraft:equippable");
                    const slot = eq?.getEquipmentSlot("Mainhand");
                    if (slot) {
                        if (slot.amount > 1) {
                            slot.amount -= 1;
                        } else {
                            slot.setItem(undefined);
                        }
                    }

                    // Bùng nổ hạt tại vị trí cũ
                    const oldPos = player.location;
                    for (let i = 0; i < 20; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const r = Math.random() * 1.5;
                        try {
                            player.dimension.spawnParticle("minecraft:endrod", {
                                x: oldPos.x + Math.cos(a) * r,
                                y: oldPos.y + Math.random() * 2.0,
                                z: oldPos.z + Math.sin(a) * r
                            });
                        } catch {}
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
                }
            } else {
                player.sendMessage("§c✦ Chưa có giường ngủ! Hãy ngủ một đêm trước.");
                player.onScreenDisplay.setTitle("§c§l✘ §r§cKhông tìm thấy giường!", {
                    fadeInDuration: 0, stayDuration: 30, fadeOutDuration: 20
                });
            }
        }
    }
}, 1);

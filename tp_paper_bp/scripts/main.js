import { world, system } from "@minecraft/server";

console.warn("[TP Paper] =============================================");
console.warn("[TP Paper] Script v5.0 - Teleport + Hệ thống Khát nước!");
console.warn("[TP Paper] =============================================");

// ════════════════════════════════════════════════════
//  PHẦN 1: GIẤY DỊCH CHUYỂN (giữ nguyên từ v4)
// ════════════════════════════════════════════════════

const activeTimers = new Map();
const TOTAL_TICKS = 100;

world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;

    // === Giấy dịch chuyển ===
    if (item?.typeId === "custom:tp_paper") {
        if (activeTimers.has(player.id)) {
            player.sendMessage("§e✦ Đang kích hoạt rồi, giữ yên!");
            return;
        }
        player.onScreenDisplay.setTitle("§b§l✦ §r§fGiấy Dịch Chuyển §b§l✦", {
            fadeInDuration: 10, stayDuration: 30, fadeOutDuration: 5
        });
        activeTimers.set(player.id, {
            startTick: system.currentTick, lastSecond: -1
        });
        player.playSound("random.orb");
        return;
    }

    // === Uống nước (chai nước) ===
    if (item?.typeId === "minecraft:potion") {
        const thirst = getThirst(player);
        if (thirst < 20) {
            setThirst(player, Math.min(20, thirst + 6));
            player.sendMessage("§b✦ Bạn đã uống nước! Độ khát phục hồi.");
            player.playSound("random.drink");
        }
    }
});

function buildProgressBar(progress) {
    const total = 20;
    const filled = Math.round(progress * total);
    const empty = total - filled;
    let color;
    if (progress > 0.6) color = "§a";
    else if (progress > 0.3) color = "§e";
    else color = "§c";
    return `${color}${"█".repeat(filled)}§8${"░".repeat(empty)} §f${Math.round(progress * 100)}%`;
}

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

// ════════════════════════════════════════════════════
//  PHẦN 2: HỆ THỐNG KHÁT NƯỚC
// ════════════════════════════════════════════════════

const THIRST_MAX = 20;
const THIRST_DECREASE_INTERVAL = 80; // Giảm 1 mỗi 4 giây (80 tick)
const THIRST_DAMAGE_INTERVAL = 40;   // Gây sát thương mỗi 2 giây khi cạn
let globalTick = 0;

// Lấy/ghi độ khát từ DynamicProperty
function getThirst(player) {
    try {
        const val = player.getDynamicProperty("thirst");
        return (val !== undefined && val !== null) ? val : THIRST_MAX;
    } catch { return THIRST_MAX; }
}

function setThirst(player, value) {
    try {
        player.setDynamicProperty("thirst", Math.max(0, Math.min(THIRST_MAX, value)));
    } catch {}
}

// Hàm tạo thanh nước (Dùng Custom Font tn.png)
function buildThirstBar(thirst) {
    const fullDrops = Math.floor(thirst / 2); // 0-10 giọt đầy (\uE150)
    const isHalf = thirst % 2 !== 0;          // Nửa giọt (\uE151)
    const emptyDrops = 10 - fullDrops - (isHalf ? 1 : 0); // Giọt rỗng (\uE152)

    const dropFull = "\uE150".repeat(fullDrops);
    const dropHalf = isHalf ? "\uE151" : "";
    const dropEmpty = "\uE152".repeat(emptyDrops);

    // Bớt padding space đi một chút để thu hẹp lại
    return `§f             ${dropFull}${dropHalf}${dropEmpty}`;
}

// ════════════════════════════════════════════════════
//  VÒNG LẶP CHÍNH - 1 TICK
// ════════════════════════════════════════════════════

system.runInterval(() => {
    globalTick++;
    const allPlayers = world.getAllPlayers();

    for (const player of allPlayers) {
        // ─── Giấy dịch chuyển ───
        if (activeTimers.has(player.id)) {
            handleTeleportTick(player);
            continue; // Khi đang dịch chuyển, không hiển thị thanh nước
        }

        // ─── Hệ thống khát nước ───
        let thirst = getThirst(player);

        // Giảm khát theo thời gian
        if (globalTick % THIRST_DECREASE_INTERVAL === 0) {
            thirst = Math.max(0, thirst - 1);
            setThirst(player, thirst);
        }

        // Hiệu ứng khi khát
        if (thirst <= 4 && globalTick % 60 === 0) {
            try {
                player.addEffect("slowness", 80, { amplifier: 0, showParticles: false });
            } catch {}
        }

        if (thirst === 0 && globalTick % THIRST_DAMAGE_INTERVAL === 0) {
            try {
                player.applyDamage(1, { cause: "starving" });
            } catch {}
        }

        // Hiển thị thanh nước trên Action Bar mỗi 10 tick (0.5 giây)
        if (globalTick % 10 === 0) {
            try {
                const bar = buildThirstBar(thirst);
                player.onScreenDisplay.setActionBar(bar);
            } catch {}
        }
    }
}, 1);

// ════════════════════════════════════════════════════
//  XỬ LÝ TICK DỊCH CHUYỂN (tách hàm cho gọn)
// ════════════════════════════════════════════════════

function handleTeleportTick(player) {
    const data = activeTimers.get(player.id);
    if (!data) return;

    let stillHolding = false;
    try {
        const eq = player.getComponent("minecraft:equippable");
        const mh = eq?.getEquipmentSlot("Mainhand");
        stillHolding = mh?.typeId === "custom:tp_paper";
    } catch {}

    if (!stillHolding) {
        activeTimers.delete(player.id);
        player.sendMessage("§c✦ Đã hủy dịch chuyển!");
        player.onScreenDisplay.setTitle("§c§l✘ Đã hủy", {
            fadeInDuration: 0, stayDuration: 15, fadeOutDuration: 10
        });
        try { player.playSound("note.bass"); } catch {}
        return;
    }

    const elapsed = system.currentTick - data.startTick;
    const progress = 1.0 - (elapsed / TOTAL_TICKS);
    const currentSecond = Math.floor(elapsed / 20);
    const remaining = 5 - currentSecond;

    // Particles
    try {
        const pos = player.location;
        const t = elapsed * 0.12;
        const radius = 2.0 * progress + 0.3;
        const yOffset = 0.8 + Math.sin(t * 0.5) * 0.5;
        for (let i = 0; i < 3; i++) {
            const angle = t + (i * Math.PI * 2 / 3);
            player.dimension.spawnParticle("minecraft:endrod", {
                x: pos.x + Math.cos(angle) * radius,
                y: pos.y + yOffset,
                z: pos.z + Math.sin(angle) * radius
            });
        }
        if (elapsed > 60) {
            for (let i = 0; i < 2; i++) {
                const a2 = -t * 1.5 + (i * Math.PI);
                const r2 = radius * 0.6;
                player.dimension.spawnParticle("minecraft:portal_directional", {
                    x: pos.x + Math.cos(a2) * r2,
                    y: pos.y + 1.0 + Math.random() * 0.8,
                    z: pos.z + Math.sin(a2) * r2
                });
            }
        }
    } catch {}

    // Title mỗi giây
    if (currentSecond !== data.lastSecond && remaining > 0) {
        data.lastSecond = currentSecond;
        player.onScreenDisplay.setTitle(getTitleForSecond(remaining), {
            fadeInDuration: 3, stayDuration: 17, fadeOutDuration: 0
        });
        player.playSound("note.pling");
    }

    // Action bar - teleport progress
    if (elapsed % 2 === 0) {
        try {
            player.onScreenDisplay.setActionBar(`§b✦ ${buildProgressBar(progress)} §b✦`);
        } catch {}
    }

    // Camera fade
    if (elapsed === 80) {
        try {
            player.camera.fade({
                fadeColor: { red: 0.2, green: 0.8, blue: 0.6 },
                fadeTime: { fadeInTime: 0.8, holdTime: 0.4, fadeOutTime: 0.8 }
            });
        } catch {}
    }

    // Dịch chuyển
    if (elapsed >= TOTAL_TICKS) {
        activeTimers.delete(player.id);
        player.onScreenDisplay.setTitle("§a§l★ §r§aDịch chuyển thành công! §a§l★", {
            fadeInDuration: 0, stayDuration: 30, fadeOutDuration: 20
        });

        let spawnPos;
        try { spawnPos = player.getSpawnPoint(); } catch {}

        if (spawnPos && spawnPos.x !== undefined) {
            try {
                const eq = player.getComponent("minecraft:equippable");
                const slot = eq?.getEquipmentSlot("Mainhand");
                if (slot) {
                    if (slot.amount > 1) slot.amount -= 1;
                    else slot.setItem(undefined);
                }

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

                const dim = world.getDimension(spawnPos.dimension?.id ?? "overworld");
                player.teleport(
                    { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
                    { dimension: dim }
                );
                player.playSound("mob.endermen.portal");
                player.sendMessage("§a✦ Dịch chuyển thành công về giường ngủ!");
                player.sendMessage(`§7  Tọa độ: ${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}`);
            } catch (err) {
                player.sendMessage(`§c[Debug] Lỗi: ${err}`);
            }
        } else {
            player.sendMessage("§c✦ Chưa có giường ngủ!");
            player.onScreenDisplay.setTitle("§c§l✘ §r§cKhông tìm thấy giường!", {
                fadeInDuration: 0, stayDuration: 30, fadeOutDuration: 20
            });
        }
    }
}

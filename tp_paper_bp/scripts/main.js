import { world, system } from "@minecraft/server";

console.warn("[TP Paper] Script đã được nạp thành công!");

world.afterEvents.itemCompleteUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;

    console.warn(`[TP Paper Debug] itemCompleteUse kích hoạt! Item: ${item?.typeId}`);

    if (item?.typeId !== "custom:tp_paper") return;
    if (player?.typeId !== "minecraft:player") return;

    player.sendMessage("§e[Debug] Giấy Dịch Chuyển đã được sử dụng xong!");

    // Đọc thông tin spawn point (giường ngủ)
    let spawnPos;
    try {
        spawnPos = player.getSpawnPoint();
        player.sendMessage(`§e[Debug] SpawnPoint: ${JSON.stringify(spawnPos)}`);
    } catch (e) {
        player.sendMessage(`§c[Debug] Lỗi khi đọc spawn point: ${e}`);
        return;
    }

    if (spawnPos && spawnPos.x !== undefined) {
        system.run(() => {
            try {
                const dim = world.getDimension(spawnPos.dimension?.id ?? "overworld");
                player.teleport(
                    { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
                    { dimension: dim }
                );
                player.sendMessage("§a✦ Đã dịch chuyển bạn về giường ngủ thành công!");
            } catch (err) {
                player.sendMessage(`§c[Debug] Lỗi teleport: ${err}`);
            }
        });
    } else {
        player.sendMessage("§c✦ Bạn chưa đặt giường ngủ nào! Hãy ngủ một đêm trước đã.");
    }
});

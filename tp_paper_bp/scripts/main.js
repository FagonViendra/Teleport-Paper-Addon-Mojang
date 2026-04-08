import { world, system } from "@minecraft/server";

const TpPaperComponent = {
    onCompleteUse(event) {
        const player = event.source;
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
        }

        const spawnPos = player.getSpawnPoint();
        if (spawnPos) {
            player.teleport(spawnPos, { dimension: spawnPos.dimension });
            player.sendMessage("§a[Hệ thống] Đã dịch chuyển bạn về điểm hồi sinh an toàn!");
        } else {
            player.sendMessage("§c[Hệ thống] Bạn chưa có điểm hồi sinh nào thiết lập từ giường cả!");
        }
    }
};

world.beforeEvents.worldInitialize.subscribe((initEvent) => {
    initEvent.itemComponentRegistry.registerCustomComponent("custom:tp_paper_use", TpPaperComponent);
});

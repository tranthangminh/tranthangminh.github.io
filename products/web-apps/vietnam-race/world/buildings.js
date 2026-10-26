/**
 * Vietnam Race - Procedural Shophouse & Commercial Building Generator
 * Conforms to: products/web-apps/_RULE-web-apps.md (< 500 lines)
 */
window.VietnamRaceBuildings = {
  createBuildingMesh(width, height, depth, variantId, colHex) {
    const assets = window.VietnamRaceAssets;
    const group = new THREE.Group();

    // Khối tường chính
    const bldGeo = new THREE.BoxGeometry(width, height, depth);
    const bldMat = new THREE.MeshLambertMaterial({ color: colHex });
    const bld = new THREE.Mesh(bldGeo, bldMat);
    bld.position.y = height / 2;
    bld.castShadow = true;
    bld.receiveShadow = true;
    group.add(bld);

    const v = Math.abs(variantId) % 7;

    if (v === 0 && assets) {
      // Variant 0: Mái bằng + Bồn nước inox Tân Á
      const tank = assets.createWaterTank();
      tank.position.set(width * 0.2, height, -depth * 0.2);
      group.add(tank);
    } else if (v === 1 && assets) {
      // Variant 1: Chuồng cọp sắt hàn phơi đồ trên nóc
      const cage = assets.createTigerCage(width * 0.75, 2.2, depth * 0.7);
      cage.position.set(0, height, 0);
      group.add(cage);
    } else if (v === 2) {
      // Variant 2: Mái tôn dốc màu xanh + Biển hiệu tầng 1
      const roofMat = (assets && assets.materials.tinBlue) ? assets.materials.tinBlue : new THREE.MeshLambertMaterial({ color: 0x2d98da });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.65, 2.2, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, height + 1.1, 0);
      group.add(roof);

      // Biển hiệu quán phở / tạp hóa tầng 1
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.8, 0.9, 0.15),
        new THREE.MeshBasicMaterial({ color: 0xe74c3c })
      );
      sign.position.set(0, 3.8, depth / 2 + 0.1);
      group.add(sign);
    } else if (v === 3) {
      // Variant 3: Mái ngói vát 4 chiều kiểu Pháp cổ điển màu cam đất
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 3.2, 4),
        new THREE.MeshLambertMaterial({ color: 0xd35400 })
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, height + 1.6, 0);
      group.add(roof);
    } else if (v === 4) {
      // Variant 4: Ban công đua ra ngoài tầng 2 & tầng 3
      const metalMat = (assets && assets.materials.metalGray) ? assets.materials.metalGray : new THREE.MeshLambertMaterial({ color: 0x4b6584 });
      [3.6, 6.8].forEach((bY) => {
        if (bY < height - 1.5) {
          const balcony = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.9, 0.9), metalMat);
          balcony.position.set(0, bY, depth / 2 + 0.45);
          group.add(balcony);
        }
      });
    } else if (v === 5) {
      // Variant 5: Tầng trệt cửa cuốn + Mái hiên di động sọc
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.85, 2.6, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x7f8c8d })
      );
      shutter.position.set(0, 1.3, depth / 2 + 0.05);
      group.add(shutter);

      const awningMat = (assets && assets.materials.tinBlue) ? assets.materials.tinBlue : new THREE.MeshLambertMaterial({ color: 0x2d98da });
      const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.1, 1.2), awningMat);
      awning.rotation.x = 0.25;
      awning.position.set(0, 2.8, depth / 2 + 0.6);
      group.add(awning);
    } else {
      // Variant 6: Khối kính văn phòng hiện đại với vệt kính phản quang
      const glassBand = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.02, height * 0.7, depth * 1.02),
        new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.1, metalness: 0.85 })
      );
      glassBand.position.set(0, height * 0.55, 0);
      group.add(glassBand);
    }

    return group;
  }
};

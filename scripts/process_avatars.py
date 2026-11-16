import os
import numpy as np
from PIL import Image
import scipy.ndimage as ndi

def process_all_avatars():
    """
    全キャラクターの通常・笑顔(有利)・困り顔(不利)アバター画像の
    黒背景完全透過処理および髪・服内部の完全不透明化スクリプト
    """
    avatars_dir = 'assets/avatars'
    
    # 1. Player A Mask Generation
    im_a_raw = Image.open(os.path.join(avatars_dir, 'watermarked_img_16123350215535067496.png')).convert('RGB')
    arr_a = np.array(im_a_raw)
    h_a, w_a, _ = arr_a.shape
    max_c_a = arr_a.max(axis=-1)
    
    is_char_a = np.zeros((h_a, w_a), dtype=bool)
    for y in range(h_a):
        row = max_c_a[y, :]
        first_x = -1
        for x in range(len(row) - 5):
            if (row[x:x+5] > 8).sum() >= 2:
                first_x = x
                break
        last_x = -1
        for x in range(len(row)-1, 4, -1):
            if (row[x-4:x+1] > 8).sum() >= 2:
                last_x = x
                break
        if first_x != -1 and last_x != -1 and last_x >= first_x:
            is_char_a[y, first_x:last_x+1] = True
            
    is_char_a = ndi.binary_closing(is_char_a, iterations=2)
    is_char_a = ndi.binary_fill_holes(is_char_a)
    mask_a_img = Image.fromarray((is_char_a * 255).astype(np.uint8), mode='L').resize((1536, 1024), Image.Resampling.NEAREST)
    mask_a = np.array(mask_a_img)

    # 2. Player B Mask Generation
    im_b_base = Image.open(os.path.join(avatars_dir, 'jockey-b.png'))
    mask_b = np.array(im_b_base)[:, :, 3]
    mask_b = np.where(mask_b > 30, 255, 0).astype(np.uint8)
    mask_b = (ndi.binary_fill_holes(mask_b > 0).astype(np.uint8) * 255)

    # 3. Player C Mask Generation (from new female green jockey)
    c_raw = Image.open(os.path.join(avatars_dir, '1c6ef6a8-9a42-421f-914f-5472a4f16826 (1).png')).convert('RGB')
    arr_c = np.array(c_raw)
    h_c, w_c, _ = arr_c.shape
    max_c_c = arr_c.max(axis=-1)
    
    dark_c = (max_c_c <= 2)
    lbl_c, _ = ndi.label(dark_c)
    seeds_c = np.zeros((h_c, w_c), dtype=bool)
    seeds_c[:, :50] = True; seeds_c[:, w_c-50:] = True
    seeds_c[0, :200] = True; seeds_c[0, w_c-200:] = True
    seeds_c[h_c-1, :200] = True; seeds_c[h_c-1, w_c-200:] = True
    
    seed_labels_c = set(np.unique(lbl_c[seeds_c & dark_c]))
    if 0 in seed_labels_c: seed_labels_c.remove(0)
    bg_mask_c = np.isin(lbl_c, list(seed_labels_c))
    char_c = ndi.binary_fill_holes(~bg_mask_c)
    mask_c_img = Image.fromarray((char_c * 255).astype(np.uint8), mode='L').resize((1536, 1024), Image.Resampling.NEAREST)
    mask_c = np.array(mask_c_img)

    jobs = [
        # (src, dst, mask)
        ('assets/avatars/jockey-a.png', 'assets/avatars/jockey-a.png', mask_a),
        ('assets/avatars/watermarked_img_16123350215535067496.png', 'assets/avatars/jockey-a-win.png', mask_a),
        ('assets/avatars/1c6ef6a8-9a42-421f-914f-5472a4f16826 (2).png', 'assets/avatars/jockey-a-lose.png', mask_a),
        ('assets/avatars/jockey-b.png', 'assets/avatars/jockey-b.png', mask_b),
        ('assets/avatars/d13ec4ac-6b67-42e3-bbf1-3dea5fa02d17.png', 'assets/avatars/jockey-b-win.png', mask_b),
        ('assets/avatars/watermarked_img_15328922837420426418.png', 'assets/avatars/jockey-b-lose.png', mask_b),
        ('assets/avatars/1c6ef6a8-9a42-421f-914f-5472a4f16826 (1).png', 'assets/avatars/jockey-c.png', mask_c),
        ('assets/avatars/c7ed0c3c-c155-4c19-a4bf-8fda6fe8a62a.png', 'assets/avatars/jockey-c-win.png', mask_c),
        ('assets/avatars/eb063335-6fb7-4821-a2cd-1f2608b893c4.png', 'assets/avatars/jockey-c-lose.png', mask_c),
    ]

    for src, dst, mask in jobs:
        src_img = Image.open(src).convert('RGB')
        src_resized = src_img.resize((1536, 1024), Image.Resampling.LANCZOS)
        rgba = np.zeros((1024, 1536, 4), dtype=np.uint8)
        rgba[:, :, :3] = np.array(src_resized)
        rgba[:, :, 3] = mask
        Image.fromarray(rgba, 'RGBA').save(dst, 'PNG')
        print(f'Processed & saved: {dst}')

if __name__ == '__main__':
    process_all_avatars()

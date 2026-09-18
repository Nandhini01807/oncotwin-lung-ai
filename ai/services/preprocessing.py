import torch
from torchvision import transforms
from PIL import Image

def get_ct_transform():
    """
    Standard PyTorch transform pipeline for DenseNet121 CT slice processing.
    Resizes to 224x224, converts to Tensor, and normalizes with ImageNet stats.
    """
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

def preprocess_ct_slice(image_pil: Image.Image) -> torch.Tensor:
    """
    Transforms a PIL RGB CT slice into a normalized (1, 3, 224, 224) PyTorch Tensor.
    """
    transform = get_ct_transform()
    tensor = transform(image_pil).unsqueeze(0)
    return tensor

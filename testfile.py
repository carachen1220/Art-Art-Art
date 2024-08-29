import wave
import pandas as pd
import os

def load_data(filename):
    # 加载 CSV 文件
    data = pd.read_csv(filename)
    return data

sample_rate = 44100  # 采样率
sample_width = 2  # 假设音频是16位的

def convert_to_wav(filename, output_file):
    # 创建 WAV 文件
    data = load_data(filename)
    audio_data = data.iloc[:, 1:].values
    with wave.open(output_file, 'wb') as wav_file:
        # 设置 WAV 文件的参数
        wav_file.setnchannels(1)  # 假设音频是单声道的
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        
        # 写入音频数据
        wav_file.writeframes(audio_data.tobytes())

def read_csv_files_in_folder(folder_path):
    # 获取文件夹下所有CSV文件的路径
    csv_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.endswith('.CSV')]
    
    return csv_files

# 使用示例
folder_path = 'datafiles'  # 替换为你的文件夹路径。
csv_files = read_csv_files_in_folder(folder_path)
print(csv_files)

def extract_filename(file_path):
    # 获取文件名
    filename = os.path.basename(file_path)
    name, ext = os.path.splitext(filename)
    
    return name

for i, file_path in enumerate(csv_files):
    filename = extract_filename(file_path)
    convert_to_wav(file_path, 'mp3/' + filename + '.mp3')
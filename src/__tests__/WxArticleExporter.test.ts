import { WxArticleExporter } from '../WxArticleExporter';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WxArticleExporter', () => {
  const testAlbumUrl = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=test&album_id=123';
  let exporter: WxArticleExporter;

  beforeEach(() => {
    exporter = new WxArticleExporter(testAlbumUrl);
    jest.clearAllMocks();
  });

  describe('fetchAlbumInfo', () => {
    it('should correctly parse album info from HTML', async () => {
      const mockHtml = `
        <html>
          <script type="text/javascript">
            window.cgiData = {
              ret: '0',
              albumId: '123',
              title: '测试专辑',
              nick_name: '测试作者',
              article_count: '10',
              read_count: '1000',
              hd_head_img: 'http://test.com/img.jpg'
            };
            window.isPaySubscribe = cgiData.is_pay_subscribe;
            window.title = cgiData.nick_name;
          </script>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const albumInfo = await (exporter as any).fetchAlbumInfo();

      expect(albumInfo).toEqual({
        title: '测试专辑',
        author: '测试作者',
        articleCount: 10,
        readCount: 1000,
        coverUrl: 'http://test.com/img.jpg'
      });
    });

    it('should handle missing data gracefully', async () => {
      const mockHtml = `
        <html>
          <script type="text/javascript">
            window.cgiData = {
              ret: '0',
              albumId: '123',
              title: '测试专辑',
              nick_name: '',
              article_count: '0',
              read_count: '',
              hd_head_img: ''
            };
            window.isPaySubscribe = cgiData.is_pay_subscribe;
          </script>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const albumInfo = await (exporter as any).fetchAlbumInfo();

      expect(albumInfo).toEqual({
        title: '测试专辑',
        author: '',
        articleCount: 0,
        readCount: 0,
        coverUrl: ''
      });
    });

    it('should throw error when cgiData is not found', async () => {
      const mockHtml = '<html><script>var data = {};</script></html>';
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      await expect((exporter as any).fetchAlbumInfo()).rejects.toThrow('无法获取专辑信息');
    });
  });

  describe('fetchArticleList', () => {
    it('should correctly parse article list', async () => {
      const mockResponse = {
        data: {
          base_resp: { ret: 0 },
          getalbum_resp: {
            article_list: [
              {
                title: '文章1',
                url: 'http://test.com/article1',
                create_time: '1625097600'
              },
              {
                title: '文章2',
                url: 'http://test.com/article2',
                create_time: '1625184000'
              }
            ],
            continue_flag: '0'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const articles = await (exporter as any).fetchArticleList();

      expect(articles).toHaveLength(2);
      expect(articles[0]).toEqual({
        title: '文章1',
        url: 'http://test.com/article1',
        createTime: 1625097600
      });
    });

    it('should handle pagination', async () => {
      const mockResponse1 = {
        data: {
          base_resp: { ret: 0 },
          getalbum_resp: {
            article_list: [
              {
                title: '文章1',
                url: 'http://test.com/article1',
                create_time: '1625097600',
                msgid: '1000',
                itemidx: '1'
              }
            ],
            continue_flag: '1'
          }
        }
      };

      const mockResponse2 = {
        data: {
          base_resp: { ret: 0 },
          getalbum_resp: {
            article_list: [
              {
                title: '文章2',
                url: 'http://test.com/article2',
                create_time: '1625184000',
                msgid: '1001',
                itemidx: '1'
              }
            ],
            continue_flag: '0'
          }
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const articles = await (exporter as any).fetchArticleList();

      expect(articles).toHaveLength(2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});